package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.MeetCheckinStorePort;
import com.bumpinto.domain.port.SeatRequestStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Audience;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.MeetCheckin;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SeatRequest;
import com.bumpinto.domain.session.SeatStatus;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * B-17 kalicilik dikisi: acik plan, katilim istegi ve check-in GERCEK Postgres'e gidip geri
 * donuyor mu. Ayri dosya (StoreAdapterTest'e eklenmedi): yeni tablolar iki yeni adaptor
 * getiriyor ve {@code @Import} listesi zaten kalabalik.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({SessionStoreAdapter.class, SeatRequestStoreAdapter.class, MeetCheckinStoreAdapter.class,
        UserStoreAdapter.class, AppConfig.class})
class OpenPlanStoreAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired SeatRequestStorePort seats;
    @Autowired MeetCheckinStorePort checkins;
    @Autowired MeetCheckinRepository checkinRows;
    @Autowired UserStoreAdapter users;

    static final Instant NOW = Instant.parse("2026-09-08T10:00:00Z");

    @Test
    void roundTripsTheOpenPlan() {
        OpenPlan plan = new OpenPlan(Instant.parse("2026-09-13T08:00:00Z"), 4, JoinPolicy.APPROVAL);

        sessions.saveSession(session("rt-open", plan));

        assertThat(sessions.sessionBySlug("rt-open").orElseThrow().openPlan()).isEqualTo(plan);
    }

    /** Gizli oturum GIZLI kalir: uc kolon da null doner, `isOpenPlan()` false. */
    @Test
    void aHiddenSessionRoundTripsWithoutAnOpenPlan() {
        sessions.saveSession(session("rt-hidden", null));

        Session back = sessions.sessionBySlug("rt-hidden").orElseThrow();
        assertThat(back.openPlan()).isNull();
        assertThat(back.isOpenPlan()).isFalse();
    }

    @Test
    void roundTripsASeatRequestAndItsDecision() {
        Session s = sessions.saveSession(session("rt-seat",
                new OpenPlan(NOW.plus(Duration.ofDays(2)), 4, JoinPolicy.APPROVAL)));
        UUID user = users.upsertByEmail("priya@bumpinto.test", "Priya");

        SeatRequest saved = seats.save(SeatRequest.pending(s.id(), user, "Priya",
                new GeoPoint(51.44, 5.47), "Woensel", TravelMode.BIKE, "Yeni geldim", NOW));

        SeatRequest back = seats.findBySessionAndUser(s.id(), user).orElseThrow();
        assertThat(back.id()).isEqualTo(saved.id());
        assertThat(back.location()).isEqualTo(new GeoPoint(51.44, 5.47));
        assertThat(back.locationLabel()).isEqualTo("Woensel");
        assertThat(back.travelMode()).isEqualTo(TravelMode.BIKE);
        assertThat(back.note()).isEqualTo("Yeni geldim");
        assertThat(back.status()).isEqualTo(SeatStatus.PENDING);
        assertThat(back.createdAt()).isNotNull(); // DB default now()
        assertThat(seats.findBySession(s.id())).hasSize(1);

        Instant decidedAt = NOW.plus(Duration.ofHours(1));
        assertThat(seats.save(back.decide(SeatStatus.APPROVED, decidedAt)).status())
                .isEqualTo(SeatStatus.APPROVED);
        assertThat(seats.findById(saved.id()).orElseThrow().decidedAt()).isEqualTo(decidedAt);
    }

    /** Konumsuz istek gecerlidir: "nerede oldugunu sonra soylerim" hali (V20 sekil kisiti). */
    @Test
    void aSeatRequestWithoutALocationRoundTrips() {
        Session s = sessions.saveSession(session("rt-noloc",
                new OpenPlan(NOW.plus(Duration.ofDays(2)), 4, JoinPolicy.OPEN)));
        UUID user = users.upsertByEmail("noloc@bumpinto.test", "Kerem");

        seats.save(SeatRequest.pending(s.id(), user, "Kerem", null, null, null, null, NOW));

        SeatRequest back = seats.findBySessionAndUser(s.id(), user).orElseThrow();
        assertThat(back.location()).isNull();
        assertThat(back.travelMode()).isEqualTo(TravelMode.CAR); // null -> CAR coerce
    }

    /**
     * Kesfet listesi: yalniz acik plan, yalniz GELECEK, karar verilmis/suresi dolmus olan yok.
     * Gizli oturumun bu listeye sizmasi Kesfet'i "herkesin oturumlari" listesine cevirirdi.
     */
    @Test
    void findPublicUpcomingSkipsHiddenPastAndDecided() {
        sessions.saveSession(session("disc-priv", null));
        sessions.saveSession(session("disc-pub",
                new OpenPlan(NOW.plus(Duration.ofDays(2)), 4, JoinPolicy.APPROVAL)));
        sessions.saveSession(session("disc-past",
                new OpenPlan(NOW.minus(Duration.ofDays(1)), 4, JoinPolicy.APPROVAL)));
        // `decided(...)` DEGIL `withStatus(DECIDED)`: sorgu STATUS'e bakiyor ve gercek bir
        // mekan satiri uretmek (decided_venue_id venues'a FK) bu testin konusu degil.
        sessions.saveSession(session("disc-dec",
                new OpenPlan(NOW.plus(Duration.ofDays(1)), 4, JoinPolicy.APPROVAL))
                .withStatus(SessionStatus.DECIDED));
        // Pencerenin DISINDA: 14 gunluk ufuktan sonrasi listede yok.
        sessions.saveSession(session("disc-far",
                new OpenPlan(NOW.plus(Duration.ofDays(20)), 4, JoinPolicy.APPROVAL)));

        assertThat(sessions.findPublicUpcoming(NOW, NOW.plus(Duration.ofDays(14))))
                .extracting(Session::slug).containsExactly("disc-pub");
    }

    /** Ayni kisi iki kez cevap verirse USTUNE yazilir: fikrini degistirebilir. */
    @Test
    void checkinIsIdempotentPerParticipant() {
        Session s = sessions.saveSession(session("rt-checkin",
                new OpenPlan(NOW.plus(Duration.ofDays(1)), 4, JoinPolicy.APPROVAL)));
        Participant host = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Mehmet", new GeoPoint(51.44, 5.47), true, null, false, null, TravelMode.CAR));

        checkins.upsert(new MeetCheckin(s.id(), host.id(), true, NOW));
        checkins.upsert(new MeetCheckin(s.id(), host.id(), false, NOW.plusSeconds(60)));

        assertThat(checkinRows.findAll()).hasSize(1);
        assertThat(checkinRows.findAll().get(0).met).isFalse();
    }

    @Test
    void roundTripsAWindowedPlanWithAudienceAndLocality() {
        OpenPlan plan = new OpenPlan(NOW, 4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(2)),
                Audience.NONE);

        sessions.saveSession(session("rt-window", plan, "Stratum"));

        Session back = sessions.sessionBySlug("rt-window").orElseThrow();
        assertThat(back.openPlan()).isEqualTo(plan);
        assertThat(back.locality()).isEqualTo("Stratum");
        assertThat(back.midpointLabel()).isEqualTo("Café Zwart"); // ikisi AYRI alan
    }

    /**
     * Kesfet: SUREN pencereli plan listede (meetAt gecmis ama openUntil gelecek), penceresi
     * biten dusmus, NONE/FRIENDS kitleli plan hic yok.
     */
    @Test
    void findPublicUpcomingListsInProgressWindowsAndOnlyPublicAudience() {
        sessions.saveSession(session("win-live", new OpenPlan(NOW.minus(Duration.ofMinutes(30)),
                4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(1)), Audience.PUBLIC), "Stratum"));
        sessions.saveSession(session("win-over", new OpenPlan(NOW.minus(Duration.ofHours(3)),
                4, JoinPolicy.OPEN, NOW.minus(Duration.ofMinutes(1)), Audience.PUBLIC), "Stratum"));
        sessions.saveSession(session("win-none", new OpenPlan(NOW.minus(Duration.ofMinutes(30)),
                4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(1)), Audience.NONE), "Stratum"));
        sessions.saveSession(session("pt-friends", new OpenPlan(NOW.plus(Duration.ofDays(1)),
                4, JoinPolicy.OPEN, null, Audience.FRIENDS), "Stratum"));

        assertThat(sessions.findPublicUpcoming(NOW, NOW.plus(Duration.ofDays(14))))
                .extracting(Session::slug).containsExactly("win-live");
    }

    /** Sayac sorgusu: yalniz o hesabin, yalniz met=true satirlari; baskasinin ve "olmadi" disarida. */
    @Test
    void metCheckinTimesOfReturnsOnlyThatUsersMetRows() {
        Session s = sessions.saveSession(session("rt-met",
                new OpenPlan(NOW.plus(Duration.ofDays(1)), 4, JoinPolicy.OPEN)));
        UUID me = users.upsertByEmail("me-met@bumpinto.test", "Ben");
        UUID other = users.upsertByEmail("other-met@bumpinto.test", "O");
        Participant mine = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Ben", null, true, null, false, null, TravelMode.CAR, me));
        Participant theirs = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "O", null, false, null, false, null, TravelMode.CAR, other));
        checkins.upsert(new MeetCheckin(s.id(), mine.id(), true, NOW));
        checkins.upsert(new MeetCheckin(s.id(), theirs.id(), true, NOW));

        assertThat(checkins.metCheckinTimesOf(me)).hasSize(1);
        assertThat(checkins.metCheckinTimesOf(other)).hasSize(1);

        checkins.upsert(new MeetCheckin(s.id(), mine.id(), false, NOW));
        assertThat(checkins.metCheckinTimesOf(me)).isEmpty();
    }

    /** B-18: capali, semtli oturum — `midpointLabel` (host etiketi) ile `locality` (semt) ayri alanlar. */
    private Session session(String slug, OpenPlan plan, String locality) {
        UUID host = users.upsertByEmail(slug + "-host@bumpinto.test", "Mehmet");
        Instant expires = plan == null ? NOW.plus(Duration.ofDays(1)) : plan.expiresAt();
        return new Session(UUID.randomUUID(), slug, host, "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING, expires,
                null, List.of(), null, null, null, "Café Zwart", new GeoPoint(51.44, 5.47), null,
                plan, locality);
    }

    /** `sessions.host_id` users'a FK: host GERCEK bir satir olmali. */
    private Session session(String slug, OpenPlan plan) {
        UUID host = users.upsertByEmail(slug + "-host@bumpinto.test", "Mehmet");
        Instant expires = plan == null ? NOW.plus(Duration.ofDays(1)) : plan.expiresAt();
        return new Session(UUID.randomUUID(), slug, host, "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING, expires,
                null, List.of(), null, null, null, null, null, null, plan);
    }
}
