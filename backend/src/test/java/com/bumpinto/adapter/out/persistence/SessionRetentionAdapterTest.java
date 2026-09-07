package com.bumpinto.adapter.out.persistence;

import com.bumpinto.adapter.in.job.SessionPurgeJob;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.retention.enabled=false"
})
class SessionRetentionAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;
    @Autowired SessionRetentionAdapter retention;
    @Autowired TransactionTemplate transactions;
    @Autowired ApplicationContext context;
    @Autowired JdbcTemplate jdbc;

    private static final Instant NOW = Instant.parse("2026-09-07T03:30:00Z");
    private static final Instant CUTOFF = NOW.minus(Duration.ofDays(30));

    private UUID host;

    @BeforeEach
    void clean() {
        // Diger testlerin biraktigi oturumlar sayimlari kirletmesin: purge tum tabloyu tarar.
        jdbc.update("delete from sessions");
        host = users.upsertByEmail("purge-host@bumpinto.test", "Purge Host");
    }

    @Test
    void deletesInBatchesUntilTheTableIsDrained() {
        session("purge-old-1", CUTOFF.minus(Duration.ofDays(3)));
        session("purge-old-2", CUTOFF.minus(Duration.ofDays(2)));
        session("purge-old-3", CUTOFF.minus(Duration.ofDays(1)));
        Session fresh = session("purge-fresh", NOW.plus(Duration.ofHours(24)));
        Session recentlyExpired = session("purge-recent", NOW.minus(Duration.ofDays(1)));

        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 2)).isEqualTo(2);
        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 2)).isEqualTo(1);
        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 2)).isZero();

        // 30 gunu doldurmayan oturumlar duruyor: purge yalniz eski olani alir.
        assertThat(slugs()).containsExactlyInAnyOrder(fresh.slug(), recentlyExpired.slug());
        assertThat(jdbc.queryForObject("select count(*) from users where id = ?", Integer.class, host))
                .isEqualTo(1);
    }

    /** Sinir KATI: expires_at tam cutoff'a esitse oturum kalir. */
    @Test
    void aSessionThatExpiredExactlyAtTheCutoffSurvives() {
        Session onTheLine = session("purge-boundary", CUTOFF);

        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 10)).isZero();
        assertThat(slugs()).containsExactly(onTheLine.slug());
    }

    @Test
    void childRowsGoWithTheSessionAndNothingElseIsTouched() {
        Session doomed = fullSession("purge-cascade", CUTOFF.minus(Duration.ofDays(1)));
        Session keeper = fullSession("purge-cascade-keep", NOW.plus(Duration.ofHours(24)));

        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 10)).isEqualTo(1);

        assertThat(rows("participants", doomed.id())).isZero();
        assertThat(rows("venues", doomed.id())).isZero();
        assertThat(rows("swipes", doomed.id())).isZero();
        assertThat(rows("votes", doomed.id())).isZero();
        assertThat(rows("participants", keeper.id())).isEqualTo(1);
        assertThat(rows("venues", keeper.id())).isEqualTo(1);
        assertThat(rows("swipes", keeper.id())).isEqualTo(1);
        assertThat(rows("votes", keeper.id())).isEqualTo(1);
    }

    /**
     * Zamanlayici HER replikada koser (K-B30). Bu test ikinci pod'u taklit eder: baska bir
     * transaction bir satiri kilitliyorken purge onu ATLAR — bekleyip kilitlenmez, ayni satiri
     * ikinci kez silmeye calismaz. Leader election/ShedLock yerine gecen mekanizma budur.
     */
    @Test
    void aRowLockedByAnotherPodIsSkippedInsteadOfWaitedOn() throws Exception {
        Session locked = session("purge-locked", CUTOFF.minus(Duration.ofDays(5)));
        session("purge-free-1", CUTOFF.minus(Duration.ofDays(4)));
        session("purge-free-2", CUTOFF.minus(Duration.ofDays(3)));

        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Void> otherPod = CompletableFuture.runAsync(() ->
                transactions.executeWithoutResult(status -> {
                    jdbc.queryForObject("select id from sessions where id = ? for update",
                            UUID.class, locked.id());
                    held.countDown();
                    await(release);
                }));

        assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
        int deleted = retention.deleteSessionsExpiredBefore(CUTOFF, 10);
        release.countDown();
        otherPod.get(10, TimeUnit.SECONDS);

        assertThat(deleted).isEqualTo(2);
        assertThat(slugs()).containsExactly(locked.slug());

        // Kilit birakildiktan sonraki kosu kalani alir: is kaybolmuyor, erteleniyor.
        assertThat(retention.deleteSessionsExpiredBefore(CUTOFF, 10)).isEqualTo(1);
        assertThat(slugs()).isEmpty();
    }

    /**
     * Ops kapatma anahtari (bu context zaten {@code retention.enabled=false} ile kosuyor):
     * bayrak KAPALIYKEN zamanlayici adaptoru hic olusmaz, ama use-case ve porta dokunulmaz —
     * elle tetikleme yolu acik kalir.
     */
    @Test
    void disablingRetentionRemovesTheScheduleButNotTheUseCase() {
        assertThat(context.getBeanNamesForType(SessionPurgeJob.class)).isEmpty();
        assertThat(context.getBeanNamesForType(SessionRetentionAdapter.class)).hasSize(1);
    }

    private Session session(String slug, Instant expiresAt) {
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Purge",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                expiresAt, null, List.of()));
    }

    private Session fullSession(String slug, Instant expiresAt) {
        Session session = session(slug, expiresAt);
        Participant seat = sessions.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Host", new GeoPoint(51.44, 5.47), true, null, false, null,
                TravelMode.CAR));
        Venue venue = new Venue(UUID.randomUUID(), session.id(), "open", slug + "-v",
                "Kafe", new GeoPoint(51.44, 5.47), null, null, null, 0);
        deck.saveVenues(List.of(venue));
        deck.saveSwipe(session.id(), venue.id(), seat.id(), true);
        deck.castVote(session.id(), venue.id(), seat.id());
        return session;
    }

    private List<String> slugs() {
        return jdbc.queryForList("select slug from sessions order by slug", String.class);
    }

    private int rows(String table, UUID sessionId) {
        String sql = switch (table) {
            case "participants" -> "select count(*) from participants where session_id = ?";
            case "venues" -> "select count(*) from venues where session_id = ?";
            case "swipes" -> "select count(*) from swipes where session_id = ?";
            case "votes" -> "select count(*) from votes where session_id = ?";
            default -> throw new IllegalArgumentException(table);
        };
        return jdbc.queryForObject(sql, Integer.class, sessionId);
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("kilit birakma sinyali gelmedi");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
