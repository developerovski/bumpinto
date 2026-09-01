package com.bumpinto.adapter.out.events;

import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class StompSessionEvents implements SessionEventsPort {

    private static final Logger log = LoggerFactory.getLogger(StompSessionEvents.class);

    private final SimpMessagingTemplate template;

    public StompSessionEvents(SimpMessagingTemplate template) {
        this.template = template;
    }

    /**
     * Aktif transaction varsa olay commit'ten SONRA gider; rollback'te hiç gitmez.
     * Böylece use-case'ler saf kalır, istemci var olmayan bir durumu görmez.
     */
    @Override
    public void publish(String slug, SessionEvent event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send(slug, event);
                }
            });
            return;
        }
        send(slug, event);
    }

    /**
     * Spring afterCommit istisnasini yakalamaz: sizarsa commit basarili oldugu halde cagiran 500
     * gorur ve ayni transaction'in kalan kancalari atlanir. Olay yayini en-iyi-cabadir; is akisini
     * bozmaz. Istemci yeniden baglandiginda durumu GET ile tazeler.
     */
    private void send(String slug, SessionEvent event) {
        try {
            template.convertAndSend("/topic/session/" + slug, event);
        } catch (RuntimeException e) {
            log.warn("session event '{}' could not be published to {}", event.type(), slug, e);
        }
    }
}
