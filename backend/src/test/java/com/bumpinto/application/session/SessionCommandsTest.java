package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionCommandsTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    FakeStores.InMemorySessionStore store;
    FakeStores.RecordingEvents events;
    SessionCommands commands;

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        events = new FakeStores.RecordingEvents();
        commands = new SessionCommands(store, events,
                Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void createSessionStartsCollectingWithHostAsParticipant() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), "Cuma kahvesi", ActivityType.COFFEE, DEN_BOSCH, "Mehmet");

        assertThat(r.session().status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(r.session().slug()).hasSize(8);
        assertThat(r.session().expiresAt()).isEqualTo(Instant.parse("2026-09-02T10:00:00Z"));
        assertThat(r.hostParticipant().host()).isTrue();
        assertThat(r.hostParticipant().hasLocation()).isTrue();
        assertThat(r.hostParticipant().token()).isNotBlank();
    }

    @Test
    void joinAddsParticipantAndPublishesEvent() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");

        Participant ayse = commands.join(r.session().slug(), "Ayşe", SOMEREN);

        assertThat(ayse.token()).isNotEqualTo(r.hostParticipant().token());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
        assertThat(events.published).hasSize(1);
        assertThat(events.published.get(0).event().type()).isEqualTo("participant_joined");
    }

    @Test
    void joinUnknownSlugThrowsNotFound() {
        assertThatThrownBy(() -> commands.join("yok", "X", null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateLocationSetsCoordinates() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");
        Participant kerem = commands.join(r.session().slug(), "Kerem", null);
        assertThat(kerem.hasLocation()).isFalse();

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN);

        assertThat(store.participants.get(kerem.id()).hasLocation()).isTrue();
    }

    @Test
    void joinRejectsSessionPastItsExpiryWithoutWritingStatus() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z").join(r.session().slug(), "Ayşe", SOMEREN))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
        assertThat(store.sessions.get(r.session().id()).status()).isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void updateLocationRejectsSessionPastItsExpiry() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");
        Participant kerem = commands.join(r.session().slug(), "Kerem", null);

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z")
                .updateLocation(r.session().slug(), kerem.id(), SOMEREN))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
    }

    SessionCommands commandsAt(String instant) {
        return new SessionCommands(store, events, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }
}
