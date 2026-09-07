package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Participant;
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

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sema V1'den beri {@code on delete cascade} tasiyor ama bu hicbir testte dogrulanmadi; B-3'un
 * purge'u tam da bu davranisa guveniyor (katilimci adi + koordinati oturumla birlikte gider).
 *
 * <p>Ikinci soru: V2'nin {@code sessions.decided_venue_id -> venues(id)} FK'si, oturum
 * silinirken AYNI ifadede cascade ile silinen bir venue'ya isaret ediyor. Bu dongusel gorunum
 * gercekten sorun cikarmiyor mu — kanit burada.
 */
@SpringBootTest(properties = {
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.retention.enabled=false"
})
class SessionCascadeDeleteTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;
    @Autowired SessionRepository repository;
    @Autowired JdbcTemplate jdbc;

    private static final Instant NOW = Instant.parse("2026-09-07T12:00:00Z");

    @Test
    void deletingASessionTakesItsChildRowsAndLeavesEveryoneElseAlone() {
        UUID host = users.upsertByEmail("cascade-host@bumpinto.test", "Cascade Host");
        UUID bystander = users.upsertByEmail("cascade-other@bumpinto.test", "Cascade Other");

        Session doomed = fullSession(host, "cascade-doomed");
        Session keeper = fullSession(bystander, "cascade-keeper");

        repository.deleteAllByIdInBatch(List.of(doomed.id()));

        assertThat(childRows(doomed.id())).isZero();
        assertThat(rows("sessions", doomed.id())).isZero();

        // Komsu oturum tam olarak durdugu gibi duruyor: silme parti icindeki id'lerle sinirli.
        assertThat(rows("participants", keeper.id())).isEqualTo(2);
        assertThat(rows("venues", keeper.id())).isEqualTo(2);
        assertThat(rows("swipes", keeper.id())).isEqualTo(2);
        assertThat(rows("votes", keeper.id())).isEqualTo(1);

        // users oturum yasam dongusunun DISINDA (kapsam karari 2): host hesabi kaliyor.
        assertThat(jdbc.queryForObject(
                "select count(*) from users where id in (?, ?)", Integer.class, host, bystander))
                .isEqualTo(2);
    }

    /** Bir oturum + 2 katilimci + 2 mekan + 2 swipe + 1 oy; kazanan mekan isaretli. */
    private Session fullSession(UUID host, String slug) {
        Session session = sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Cascade",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                NOW.plus(Duration.ofHours(24)), null, List.of()));

        Participant hostSeat = sessions.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Host", new GeoPoint(51.44, 5.47), true, null, false, null,
                TravelMode.CAR));
        Participant guest = sessions.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Guest", new GeoPoint(51.45, 5.48), false, null, false, null,
                TravelMode.BIKE));

        Venue winner = new Venue(UUID.randomUUID(), session.id(), "open", slug + "-a",
                "Kafe A", new GeoPoint(51.44, 5.47), null, null, null, 0);
        Venue other = new Venue(UUID.randomUUID(), session.id(), "open", slug + "-b",
                "Kafe B", new GeoPoint(51.45, 5.48), null, null, null, 1);
        deck.saveVenues(List.of(winner, other));

        deck.saveSwipe(session.id(), winner.id(), hostSeat.id(), true);
        deck.saveSwipe(session.id(), winner.id(), guest.id(), true);
        deck.castVote(session.id(), winner.id(), hostSeat.id());

        // decided_venue_id: silinirken cascade ile giden bir venue'ya isaret eden FK.
        return sessions.saveSession(session.decided(winner.id(), DecisionKind.UNANIMOUS, NOW));
    }

    private int childRows(UUID sessionId) {
        return rows("participants", sessionId) + rows("venues", sessionId)
                + rows("swipes", sessionId) + rows("votes", sessionId);
    }

    /** Sorgular sabit metin: tablo adi da parametre degil (ArchUnit'in SQL durusu testte de gecerli). */
    private int rows(String table, UUID sessionId) {
        String sql = switch (table) {
            case "sessions" -> "select count(*) from sessions where id = ?";
            case "participants" -> "select count(*) from participants where session_id = ?";
            case "venues" -> "select count(*) from venues where session_id = ?";
            case "swipes" -> "select count(*) from swipes where session_id = ?";
            case "votes" -> "select count(*) from votes where session_id = ?";
            default -> throw new IllegalArgumentException(table);
        };
        return jdbc.queryForObject(sql, Integer.class, sessionId);
    }
}
