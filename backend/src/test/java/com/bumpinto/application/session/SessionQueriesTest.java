package com.bumpinto.application.session;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Okuma tarafı da tembel expiry uygular — aksi halde süresi dolmuş oturum GET'te COLLECTING görünür. */
class SessionQueriesTest {

    static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

    final FakeStores.InMemorySessionStore sessions = new FakeStores.InMemorySessionStore();
    final FakeStores.InMemoryDeckStore deck = new FakeStores.InMemoryDeckStore();
    final SessionQueries queries =
            new SessionQueries(sessions, deck, Clock.fixed(NOW, ZoneOffset.UTC));

    Session stored(SessionStatus status, Instant expiresAt) {
        Session session = new Session(UUID.randomUUID(), "x7k2m", UUID.randomUUID(), "Kahve",
                ActivityType.COFFEE, status, expiresAt, null, List.of());
        return sessions.saveSession(session);
    }

    void venueIn(Session session) {
        deck.saveVenues(List.of(new Venue(UUID.randomUUID(), session.id(), "fsq", "e1", "Kafe",
                new GeoPoint(51.7, 5.3), 4.5, 2, null, null, 0)));
    }

    @Test
    void liveSessionKeepsItsStatusAndShowsTheDeck() {
        Session session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        venueIn(session);

        SessionQueries.SessionSnapshot snap = queries.snapshot("x7k2m");

        assertThat(snap.session().status()).isEqualTo(SessionStatus.SWIPING);
        assertThat(snap.venues()).hasSize(1);
    }

    @Test
    void expiredSessionIsReportedExpiredWithoutWritingToTheStore() {
        Session session = stored(SessionStatus.SWIPING, NOW.minusSeconds(1));
        venueIn(session);

        SessionQueries.SessionSnapshot snap = queries.snapshot("x7k2m");

        assertThat(snap.session().status()).isEqualTo(SessionStatus.EXPIRED);
        assertThat(snap.venues()).isEmpty(); // kapalı oturumda deste gösterilmez
        assertThat(sessions.sessions.get(session.id()).status())
                .isEqualTo(SessionStatus.SWIPING); // GET'in yan etkisi yok
    }

    /** Sınır katı: expiresAt anının kendisi henüz dolmuş sayılmaz (komut tarafıyla aynı kural). */
    @Test
    void expiryBoundaryIsStrict() {
        stored(SessionStatus.COLLECTING, NOW);

        assertThat(queries.snapshot("x7k2m").session().status())
                .isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void unknownSlugIsNotFound() {
        assertThatThrownBy(() -> queries.snapshot("nope"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("session not found");
    }
}
