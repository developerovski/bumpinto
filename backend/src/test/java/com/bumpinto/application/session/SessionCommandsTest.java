package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
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
                UUID.randomUUID(), "Cuma kahvesi", ActivityType.COFFEE, SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null);

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
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);

        Participant ayse = commands.join(r.session().slug(), "Ayşe", SOMEREN, null);

        assertThat(ayse.token()).isNotEqualTo(r.hostParticipant().token());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
        assertThat(events.published).hasSize(1);
        assertThat(events.published.get(0).event().type()).isEqualTo("participant_joined");
    }

    @Test
    void joinUnknownSlugThrowsNotFound() {
        assertThatThrownBy(() -> commands.join("yok", "X", null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateLocationSetsCoordinates() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        Participant kerem = commands.join(r.session().slug(), "Kerem", null, null);
        assertThat(kerem.hasLocation()).isFalse();

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren");

        assertThat(store.participants.get(kerem.id()).hasLocation()).isTrue();
        assertThat(store.participants.get(kerem.id()).locationLabel()).isEqualTo("Someren");
    }

    @Test
    void updateLocationWithoutLabelKeepsExistingLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        Participant kerem = commands.join(r.session().slug(), "Kerem", SOMEREN, "Someren");

        commands.updateLocation(r.session().slug(), kerem.id(), DEN_BOSCH, null);

        assertThat(store.participants.get(kerem.id()).location()).isEqualTo(DEN_BOSCH);
        assertThat(store.participants.get(kerem.id()).locationLabel()).isEqualTo("Someren");
    }

    @Test
    void joinRejectsSessionPastItsExpiryWithoutWritingStatus() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z").join(r.session().slug(), "Ayşe", SOMEREN, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
        assertThat(store.sessions.get(r.session().id()).status()).isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void updateLocationRejectsSessionPastItsExpiry() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        Participant kerem = commands.join(r.session().slug(), "Kerem", null, null);

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z")
                .updateLocation(r.session().slug(), kerem.id(), SOMEREN, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
    }

    SessionCommands commandsAt(String instant) {
        return new SessionCommands(store, events, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }

    @Test
    void createSessionCarriesTypeAndHostLocationLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Ayşe'yle kahve", ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet",
                "'s-Hertogenbosch");
        assertThat(r.session().sessionType()).isEqualTo(SessionType.SOLO);
        assertThat(r.hostParticipant().locationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(r.hostParticipant().manual()).isFalse();
    }

    @Test
    void addPointCreatesManualParticipantOnlyForSoloHostWhileCollecting() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.session().hostId(),
                "Ayşe", "Someren", SOMEREN);
        assertThat(ayse.manual()).isTrue();
        assertThat(ayse.token()).isNull();
        assertThat(ayse.host()).isFalse();
        assertThat(ayse.locationLabel()).isEqualTo("Someren");
        assertThat(store.participantsOf(solo.session().id())).hasSize(2);

        assertThatThrownBy(() -> commands.addPoint(solo.session().slug(), UUID.randomUUID(),
                "X", null, SOMEREN)).isInstanceOf(ForbiddenException.class);

        SessionCommands.CreateSessionResult group = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        assertThatThrownBy(() -> commands.addPoint(group.session().slug(), group.session().hostId(),
                "Ayşe", "Someren", SOMEREN)).isInstanceOf(ConflictException.class);
    }

    @Test
    void removePointDeletesOnlyManualParticipants() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.session().hostId(),
                "Ayşe", "Someren", SOMEREN);
        commands.removePoint(solo.session().slug(), solo.session().hostId(), ayse.id());
        assertThat(store.participantsOf(solo.session().id())).hasSize(1);
        assertThat(events.published).extracting(p -> p.event().type())
                .containsExactly("participant_joined", "participant_left");
        assertThatThrownBy(() -> commands.removePoint(solo.session().slug(), solo.session().hostId(),
                solo.hostParticipant().id())).isInstanceOf(ConflictException.class);
    }

    @Test
    void joinIsRejectedOnSoloSession() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        assertThatThrownBy(() -> commands.join(solo.session().slug(), "Ayşe", SOMEREN, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("solo");
    }
}
