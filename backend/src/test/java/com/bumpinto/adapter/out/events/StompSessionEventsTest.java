package com.bumpinto.adapter.out.events;

import com.bumpinto.domain.port.SessionEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class StompSessionEventsTest {

    /** Kaynaksız gerçek tx yöneticisi: commit/rollback senkronizasyonlarını Spring'in kendisi tetikler. */
    static class ResourcelessTxManager extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() {
            return new Object();
        }

        @Override protected void doBegin(Object transaction, TransactionDefinition definition) {
        }

        @Override protected void doCommit(DefaultTransactionStatus status) {
        }

        @Override protected void doRollback(DefaultTransactionStatus status) {
        }
    }

    final SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
    final StompSessionEvents events = new StompSessionEvents(template);
    final TransactionTemplate tx = new TransactionTemplate(new ResourcelessTxManager());

    @Test
    void publishesToSessionTopicWhenNoTransactionIsActive() {
        SessionEvent event = SessionEvent.deckReady(12);

        events.publish("x7k2m", event);

        verify(template).convertAndSend("/topic/session/x7k2m", event);
    }

    @Test
    void insideTransactionNothingIsSentUntilCommit() {
        SessionEvent event = SessionEvent.deckReady(12);

        tx.executeWithoutResult(status -> {
            events.publish("x7k2m", event);
            verifyNoInteractions(template); // commit'ten önce sessiz
        });

        verify(template).convertAndSend("/topic/session/x7k2m", event);
    }

    @Test
    void rolledBackTransactionPublishesNothing() {
        tx.executeWithoutResult(status -> {
            events.publish("x7k2m", SessionEvent.deckReady(12));
            status.setRollbackOnly();
        });

        verify(template, never()).convertAndSend(anyString(), ArgumentMatchers.<Object>any());
    }

    /** Broker cokerse commit yine basarilidir: cagiran 500 gormez, sonraki afterCommit kancalari kosar. */
    @Test
    void brokerFailureAfterCommitIsSwallowedAndLaterHooksStillRun() {
        doThrow(new MessagingException("broker down"))
                .when(template).convertAndSend(anyString(), ArgumentMatchers.<Object>any());
        List<String> laterHooks = new ArrayList<>();

        assertThatCode(() -> tx.executeWithoutResult(status -> {
            events.publish("x7k2m", SessionEvent.deckReady(12));
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() {
                    laterHooks.add("ran");
                }
            });
        })).doesNotThrowAnyException();

        assertThat(laterHooks).containsExactly("ran");
    }
}
