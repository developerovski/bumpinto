package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.retention.enabled=false"
})
class VenueRetentionAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;
    @Autowired VenueRetentionAdapter retention;
    @Autowired JdbcTemplate jdbc;

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");

    @Test
    void stripsLosersKeepsWinnerIdentityAndNeverTouchesOpenRows() {
        UUID host = users.upsertByEmail("retention1@bumpinto.test", "Retention Host");
        Session expired = sessions.saveSession(new Session(UUID.randomUUID(), "retn-expired", host,
                "Retention", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.EXPIRED,
                NOW.minus(Duration.ofHours(1)), null, List.of()));

        Venue winner = new Venue(UUID.randomUUID(), expired.id(), "foursquare", "winner",
                "Kazanan Kafe", new GeoPoint(51.44, 5.47), 8.7, null, "https://photo/winner", 0,
                null, null, null, null, null, "https://winner.example", ActivityType.COFFEE,
                null, null, null);
        Venue loser = new Venue(UUID.randomUUID(), expired.id(), "foursquare", "loser",
                "Kaybeden Kafe", new GeoPoint(51.45, 5.48), 7.0, null, "https://photo/loser", 1,
                null, null, null, null, null, "https://loser.example", ActivityType.COFFEE,
                0.5, null, "ph-loser");
        Venue openVenue = new Venue(UUID.randomUUID(), expired.id(), "open", "park",
                "Stadswandelpark", new GeoPoint(51.46, 5.49), null, null, "https://photo/park", 2);
        deck.saveVenues(List.of(winner, loser, openVenue));
        sessions.saveSession(expired.decided(winner.id(), DecisionKind.UNANIMOUS,
                NOW.minus(Duration.ofMinutes(90))));

        int stripped = retention.stripExpiredSessions(Set.of("foursquare"), NOW);
        int winnersStripped = retention.stripWinnerPhotos(Set.of("foursquare"), NOW);

        assertThat(stripped).isEqualTo(1);
        assertThat(winnersStripped).isEqualTo(1);

        Venue loserAfter = venueRow(expired.id(), "loser");
        assertThat(loserAfter.name()).isNull();
        assertThat(loserAfter.rating()).isNull();
        assertThat(loserAfter.popularity()).isNull();
        assertThat(loserAfter.photoUrl()).isNull();
        assertThat(loserAfter.externalId()).isEqualTo("loser");
        assertThat(loserAfter.photoRef()).isEqualTo("ph-loser");
        assertThat(loserAfter.location()).isEqualTo(new GeoPoint(51.45, 5.48));
        assertThat(loserAfter.placeLink()).isEqualTo("https://loser.example");

        Venue winnerAfter = venueRow(expired.id(), "winner");
        assertThat(winnerAfter.name()).isEqualTo("Kazanan Kafe");
        assertThat(winnerAfter.placeLink()).isEqualTo("https://winner.example");
        assertThat(winnerAfter.photoUrl()).isNull();
        assertThat(winnerAfter.rating()).isNull();

        Venue openAfter = venueRow(expired.id(), "park");
        assertThat(openAfter.name()).isEqualTo("Stadswandelpark");
        assertThat(openAfter.photoUrl()).isEqualTo("https://photo/park");
    }

    @Test
    void stripsRowsOlderThanTheCutoffRegardlessOfSessionState() {
        UUID host = users.upsertByEmail("retention2@bumpinto.test", "Retention Host 2");
        Session fresh = sessions.saveSession(new Session(UUID.randomUUID(), "retn-fresh", host,
                "Fresh", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                NOW.plus(Duration.ofHours(24)), null, List.of()));
        Venue aged = new Venue(UUID.randomUUID(), fresh.id(), "tripadvisor", "aged",
                "Eski Cafe", new GeoPoint(51.44, 5.47), 4.0, null, "https://photo/aged", 0);
        deck.saveVenues(List.of(aged));
        // fetched_at domain'de yok (yalniz saklama okur): satiri elle yaslandiriyoruz.
        jdbc.update("update venues set fetched_at = ? where id = ?",
                Timestamp.from(NOW.minus(Duration.ofHours(30))), aged.id());

        int result = retention.stripOlderThan(Set.of("tripadvisor"), NOW.minus(Duration.ofHours(24)));

        assertThat(result).isEqualTo(1);
        assertThat(venueRow(fresh.id(), "aged").name()).isNull();
    }

    private Venue venueRow(UUID sessionId, String externalId) {
        return deck.venuesOf(sessionId).stream()
                .filter(v -> v.externalId().equals(externalId)).findFirst().orElseThrow();
    }
}
