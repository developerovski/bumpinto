package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.user.Consents;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserConsentsTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");

    final FakeStores.InMemoryUserStore users = new FakeStores.InMemoryUserStore();
    final UserConsents service = new UserConsents(users, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void defaultsAreAllFalseAndWritingStampsTimeAndVersion() {
        UUID id = users.upsertByEmail("a@bumpinto.test", "A");
        assertThat(users.profileOf(id).orElseThrow().consents().analytics()).isFalse();
        assertThat(users.profileOf(id).orElseThrow().consents().updatedAt()).isNull();

        Consents saved = service.update(id, true, false, true);

        assertThat(saved.location()).isTrue();
        assertThat(saved.microphone()).isFalse();
        assertThat(saved.analytics()).isTrue();
        assertThat(saved.updatedAt()).isEqualTo(NOW);
        assertThat(saved.version()).isEqualTo(Consents.CURRENT_VERSION);
        // Cihaz degisse de tercih hesapta durur.
        assertThat(users.profileOf(id).orElseThrow().consents()).isEqualTo(saved);
    }

    @Test
    void unknownAccountIsNotFound() {
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), true, true, true))
                .isInstanceOf(NotFoundException.class);
    }
}
