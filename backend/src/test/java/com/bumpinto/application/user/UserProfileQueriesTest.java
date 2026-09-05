package com.bumpinto.application.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import java.time.Clock;
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
    UserProfileQueries queries;
    UUID host;
    Session s1;
    Session s2;
    Session s3;

    @BeforeEach
    void setUp() {
        sessions = new FakeStores.InMemorySessionStore();
        users = new FakeStores.InMemoryUserStore();
        queries = new UserProfileQueries(users, sessions, Clock.fixed(NOW, ZoneOffset.UTC));
        host = users.upsertByEmail("h@x.test", "Host");

        s1 = newSession("t1sess", SessionStatus.COLLECTING, NOW.minusSeconds(1));
        sessions.createdAt.put(s1.id(), NOW.minusSeconds(300));
        s2 = newSession("t2sess", SessionStatus.DECIDED, NOW.plusSeconds(3600));
        sessions.createdAt.put(s2.id(), NOW.minusSeconds(200));
        s3 = newSession("t3sess", SessionStatus.SWIPING, NOW.plusSeconds(3600));
        sessions.createdAt.put(s3.id(), NOW.minusSeconds(100));

        join(s1, "Host", true, false);
        join(s1, "Ayşe", false, false);
        join(s1, "Nokta", false, true);
        join(s2, "Host", true, false);
        join(s2, "Ayşe", false, false);
        join(s3, "Host", true, false);
        join(s3, "Kerem", false, false);
    }

    Session newSession(String slug, SessionStatus status, Instant expiresAt) {
        Session session = new Session(UUID.randomUUID(), slug, host, "Cuma",
                List.of(ActivityType.COFFEE),
                SessionType.GROUP, status, expiresAt, null, List.of());
        return sessions.saveSession(session);
    }

    void join(Session session, String name, boolean isHost, boolean manual) {
        sessions.saveParticipant(new com.bumpinto.domain.session.Participant(UUID.randomUUID(),
                session.id(), name, new GeoPoint(51.7, 5.3), isHost, null, manual, null, null));
    }

    @Test
    void mySessionsReturnsNewestFirstAndAppliesLazyExpiryWithoutWriting() {
        List<SessionSummary> summaries = queries.mySessions(host);

        assertThat(summaries).hasSize(3);
        assertThat(summaries).extracting(s -> s.session().id())
                .containsExactly(s3.id(), s2.id(), s1.id());
        assertThat(summaries.get(2).session().status()).isEqualTo(SessionStatus.EXPIRED);
        assertThat(sessions.sessions.get(s1.id()).status()).isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void meReportsHostedSessionsAndDistinctFriendsMet() {
        UserProfileQueries.Me me = queries.me(host);

        assertThat(me.stats().sessionsHosted()).isEqualTo(3);
        assertThat(me.stats().friendsMet()).isEqualTo(2);

        assertThatThrownBy(() -> queries.me(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }
}
