package com.bumpinto.application.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountDeletionTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");

    final FakeStores.InMemoryUserStore users = new FakeStores.InMemoryUserStore();
    final FakeStores.InMemorySessionStore sessions = new FakeStores.InMemorySessionStore();
    final AccountIdentityTest.FakeAppleTokens apple = new AccountIdentityTest.FakeAppleTokens();
    final AccountDeletion deletion =
            new AccountDeletion(users, sessions, apple, Clock.fixed(NOW, ZoneOffset.UTC));

    UUID hostedSession(UUID hostId, String slug) {
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, hostId, "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                NOW.plus(Duration.ofHours(24)), null, List.of(), null, null, null, null, null)).id();
    }

    @Test
    void hostSessionsAreDeletedGuestSeatsAreAnonymizedAndAppleIsRevoked() {
        UUID me = users.upsertByEmail("me@bumpinto.test", "Ben");
        users.saveAppleRefreshToken(me, "rt-1");
        UUID mine = hostedSession(me, "mine");
        UUID others = hostedSession(users.upsertByEmail("host@bumpinto.test", "Host"), "others");
        UUID seat = UUID.randomUUID();
        sessions.saveParticipant(new Participant(seat, others, "Ben", new GeoPoint(51.69, 5.30),
                false, null, false, "Den Bosch", TravelMode.CAR, me));

        deletion.delete(me);

        assertThat(sessions.sessions).doesNotContainKey(mine);
        Participant left = sessions.participants.get(seat);
        assertThat(left.displayName()).isEqualTo("Ayrıldı");
        assertThat(left.userId()).isNull();
        assertThat(left.location()).isNull();
        assertThat(users.profileOf(me)).isEmpty();
        assertThat(apple.revoked).isEqualTo("rt-1");
        assertThat(users.deletedAt.get(me)).isEqualTo(NOW);
        assertThat(users.purgeAfter.get(me)).isEqualTo(NOW.plus(Duration.ofDays(30)));
    }

    /** Apple revoke patlarsa silme YINE tamamlanir (5.1.1(v) silmeyi sarta baglamaz). */
    @Test
    void failedRevokeDoesNotBlockDeletion() {
        UUID me = users.upsertByEmail("me2@bumpinto.test", "Ben");
        users.saveAppleRefreshToken(me, "rt-2");
        apple.revokeThrows = true;

        deletion.delete(me);

        assertThat(users.profileOf(me)).isEmpty();
    }
}
