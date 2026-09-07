package com.bumpinto.domain.safety;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlockTest {

    private static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    private static final UUID ME = UUID.randomUUID();

    @Test
    void accountBlockCarriesNoSessionScopeButParticipantBlockDoes() {
        UUID session = UUID.randomUUID();
        Block account = Block.ofUser(UUID.randomUUID(), ME, UUID.randomUUID(), T0);
        Block scoped = Block.ofParticipant(UUID.randomUUID(), ME, UUID.randomUUID(), session, T0);
        assertThat(account.accountBlock()).isTrue();
        assertThat(account.sessionId()).isNull();
        assertThat(scoped.accountBlock()).isFalse();
        assertThat(scoped.sessionId()).isEqualTo(session);
    }

    @Test
    void halfTargetsSelfBlocksAndUnscopedParticipantBlocksAreRejected() {
        assertThatThrownBy(() -> new Block(UUID.randomUUID(), ME, null, null, null, T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Block.ofUser(UUID.randomUUID(), ME, ME, T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Block(UUID.randomUUID(), ME, null, UUID.randomUUID(), null, T0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
