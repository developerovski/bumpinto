package com.bumpinto.application.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.MeetCheckin;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserProfileQueriesTest {

    static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

    FakeStores.InMemorySessionStore sessions;
    FakeStores.InMemoryUserStore users;
    FakeStores.InMemoryMeetCheckinStore checkins;
    UserProfileQueries queries;
    UUID host;
    Session s1;
    Session s2;
    Session s3;

    @BeforeEach
    void setUp() {
        sessions = new FakeStores.InMemorySessionStore();
        users = new FakeStores.InMemoryUserStore();
        checkins = new FakeStores.InMemoryMeetCheckinStore();
        queries = new UserProfileQueries(users, sessions, checkins,
                Clock.fixed(NOW, ZoneOffset.UTC));
        host = users.upsertByEmail("h@x.test", "Host");

        s1 = newSession("t1sess", SessionStatus.COLLECTING, NOW.minusSeconds(1));
        sessions.createdAt.put(s1.id(), NOW.minusSeconds(300));
        s2 = newSession("t2sess", SessionStatus.DECIDED, NOW.plusSeconds(3600));
        sessions.createdAt.put(s2.id(), NOW.minusSeconds(200));
        s3 = newSession("t3sess", SessionStatus.SWIPING, NOW.plusSeconds(3600));
        sessions.createdAt.put(s3.id(), NOW.minusSeconds(100));

        join(s1, "Host", true, false, host);
        join(s1, "Ayşe", false, false, UUID.randomUUID());
        join(s1, "Nokta", false, true, null);
        join(s2, "Host", true, false, host);
        join(s2, "Ayşe", false, false, UUID.randomUUID());
        join(s3, "Host", true, false, host);
        join(s3, "Kerem", false, false, UUID.randomUUID());
    }

    Session newSession(String slug, SessionStatus status, Instant expiresAt) {
        Session session = new Session(UUID.randomUUID(), slug, host, "Cuma",
                List.of(ActivityType.COFFEE),
                SessionType.GROUP, status, expiresAt, null, List.of());
        return sessions.saveSession(session);
    }

    Participant join(Session session, String name, boolean isHost, boolean manual, UUID userId) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), session.id(), name,
                new GeoPoint(51.7, 5.3), isHost, null, manual, null, null, userId));
    }

    @Test
    void mySessionsReturnsNewestFirstAndAppliesLazyExpiryWithoutWriting() {
        UserProfileQueries.MySessions mine = queries.mySessions(host);

        assertThat(mine.open()).extracting(s -> s.session().id()).containsExactly(s3.id());
        // s1'in KAYITLI statusu hala COLLECTING ama TTL'i gecmis: gecmise duser, acik kutuya
        // degil — yoksa suresi dolmus oturum "devam ediyor" gibi gorunurdu.
        assertThat(mine.past()).extracting(s -> s.session().id())
                .containsExactly(s2.id(), s1.id());
        assertThat(mine.past().get(1).session().status()).isEqualTo(SessionStatus.EXPIRED);
        assertThat(sessions.sessions.get(s1.id()).status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(mine.pastTruncated()).isFalse();
    }

    /**
     * Tavan GECMISI korur, aciklari degil. Eskiden tek sorgu once en yeni 20 satiri cekip
     * kutulara SONRA ayirdigi icin, cok sayida yeni oturum acan host'un eski ama hala acik
     * oturumu listeden sessizce dusuyordu — ulasilacak baska yol da yoktu.
     */
    @Test
    void oldOpenSessionSurvivesAFullPastList() {
        Session oldButOpen = newSession("oldopen", SessionStatus.COLLECTING, NOW.plusSeconds(3600));
        sessions.createdAt.put(oldButOpen.id(), NOW.minusSeconds(10_000)); // hepsinden ESKI
        for (int i = 0; i < UserProfileQueries.LIST_LIMIT + 5; i++) {
            Session past = newSession("old" + i, SessionStatus.DECIDED, NOW.plusSeconds(3600));
            sessions.createdAt.put(past.id(), NOW.minusSeconds(50 - i)); // hepsi daha YENI
        }

        UserProfileQueries.MySessions mine = queries.mySessions(host);

        assertThat(mine.open()).extracting(s -> s.session().id())
                .containsExactly(s3.id(), oldButOpen.id());
        assertThat(mine.past()).hasSize(UserProfileQueries.LIST_LIMIT);
        assertThat(mine.pastTruncated()).isTrue();
    }

    /** Kesilme bayragi TAVANA degil GERCEKTEN kesilmeye bakar: tam 20 gecmis "daha var" demez. */
    @Test
    void pastTruncatedOnlyWhenThePastListActuallyGotCut() {
        // setUp'tan iki gecmis var (s1 suresi dolmus, s2 karar verilmis); tam tavana tamamla.
        for (int i = 0; i < UserProfileQueries.LIST_LIMIT - 2; i++) {
            Session past = newSession("full" + i, SessionStatus.DECIDED, NOW.plusSeconds(3600));
            sessions.createdAt.put(past.id(), NOW.minusSeconds(50 - i));
        }

        UserProfileQueries.MySessions exactlyFull = queries.mySessions(host);
        assertThat(exactlyFull.past()).hasSize(UserProfileQueries.LIST_LIMIT);
        assertThat(exactlyFull.pastTruncated()).isFalse();

        Session oneMore = newSession("overflow", SessionStatus.DECIDED, NOW.plusSeconds(3600));
        sessions.createdAt.put(oneMore.id(), NOW.minusSeconds(10));

        UserProfileQueries.MySessions overflowing = queries.mySessions(host);
        assertThat(overflowing.past()).hasSize(UserProfileQueries.LIST_LIMIT);
        assertThat(overflowing.past()).extracting(s -> s.session().id()).contains(oneMore.id());
        assertThat(overflowing.pastTruncated()).isTrue();
    }

    @Test
    void meReportsHostedSessionsAndDistinctFriendsMet() {
        UserProfileQueries.Me me = queries.me(host);

        assertThat(me.stats().sessionsHosted()).isEqualTo(3);
        assertThat(me.stats().friendsMet()).isEqualTo(2);

        assertThatThrownBy(() -> queries.me(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    /** plansMet = kendi koltuklarimin met=true cevaplari; seri bu/gecen haftadan geriye ardisik. */
    @Test
    void meReportsPlansMetAndWeeklyStreak() {
        Participant mineInS1 = join(s1, "Host", true, false, host);
        Participant mineInS2 = join(s2, "Host", true, false, host);
        Participant someoneElse = join(s2, "Kerem", false, false, UUID.randomUUID());
        checkins.userOfParticipant.put(mineInS1.id(), host);
        checkins.userOfParticipant.put(mineInS2.id(), host);
        checkins.userOfParticipant.put(someoneElse.id(), someoneElse.userId());
        checkins.upsert(new MeetCheckin(s1.id(), mineInS1.id(), true, NOW.minusSeconds(60)));
        checkins.upsert(new MeetCheckin(s2.id(), mineInS2.id(), true, NOW.minus(Duration.ofDays(7))));
        checkins.upsert(new MeetCheckin(s2.id(), someoneElse.id(), true, NOW)); // baskasinin
        checkins.upsert(new MeetCheckin(s3.id(), mineInS1.id(), false, NOW)); // "olmadi" sayilmaz

        UserProfileQueries.Stats stats = queries.me(host).stats();

        assertThat(stats.plansMet()).isEqualTo(2);
        assertThat(stats.metStreakWeeks()).isEqualTo(2);
    }
}
