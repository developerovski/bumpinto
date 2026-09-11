package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** "Bulustunuz mu?" kapilari: acik plan, bulusma gecmis, ve gercek uyelik. */
class MeetCheckinsTest {

    static final Instant MEET = Instant.parse("2026-09-13T08:00:00Z");
    static final Instant BEFORE = MEET.minusSeconds(60);
    static final Instant AFTER = MEET.plusSeconds(3600);

    FakeStores.InMemorySessionStore sessions;
    FakeStores.InMemoryMeetCheckinStore checkins;
    SessionCommands commands;
    Session plan;
    Participant hostSeat;

    final UUID host = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        sessions = new FakeStores.InMemorySessionStore();
        checkins = new FakeStores.InMemoryMeetCheckinStore();
        commands = new SessionCommands(sessions, new FakeStores.RecordingEvents(),
                new FakeStores.FakeReverseGeocoder(), Clock.fixed(BEFORE, ZoneOffset.UTC));
        SessionCommands.CreateSessionResult r = commands.createSession(host, "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, new GeoPoint(51.44, 5.47), "Ayşe",
                null, TravelMode.BIKE, null, new OpenPlan(MEET, 4, JoinPolicy.APPROVAL));
        plan = r.session();
        hostSeat = r.hostParticipant();
    }

    private MeetCheckins at(Instant now) {
        return new MeetCheckins(sessions, checkins, Clock.fixed(now, ZoneOffset.UTC));
    }

    /** Once sorulursa cevap NIYET olur, olcum degil. */
    @Test
    void beforeTheMeetingItIsAConflict() {
        assertThatThrownBy(() -> at(BEFORE).record(plan.slug(), hostSeat.id(), true))
                .isInstanceOf(ConflictException.class);
    }

    /** Kisi basina TEK cevap; ikincisi USTUNE yazar (fikrini degistirebilir). */
    @Test
    void afterTheMeetingItRecordsOncePerParticipant() {
        MeetCheckins svc = at(AFTER);

        svc.record(plan.slug(), hostSeat.id(), true);
        svc.record(plan.slug(), hostSeat.id(), false);

        assertThat(checkins.saved).hasSize(1);
        assertThat(checkins.saved.values().iterator().next().met()).isFalse();
    }

    /** Gizli oturumda bu soru HIC sorulmaz: "bulunamadi", "izin yok" degil (varligi sizmaz). */
    @Test
    void aHiddenSessionHasNoCheckin() {
        Session hidden = commands.createSession(host, "Kahve", List.of(ActivityType.COFFEE),
                SessionType.GROUP, new GeoPoint(51.44, 5.47), "Ayşe", null, TravelMode.CAR, null)
                .session();

        assertThatThrownBy(() -> at(AFTER).record(hidden.slug(), hostSeat.id(), true))
                .isInstanceOf(NotFoundException.class);
    }

    /** Uyelik DB'den okunur: oturumda olmayan biri cevap yazamaz. */
    @Test
    void aStrangerCannotCheckIn() {
        assertThatThrownBy(() -> at(AFTER).record(plan.slug(), UUID.randomUUID(), true))
                .isInstanceOf(ForbiddenException.class);
    }

    /** Sinir DAHIL: bulusma ANINDA soru sorulabilir (OpenPlan.meetPassed ile ayni kural). */
    @Test
    void theMeetInstantItselfIsAlreadyPast() {
        at(MEET).record(plan.slug(), hostSeat.id(), true);

        assertThat(checkins.saved).hasSize(1);
    }
}
