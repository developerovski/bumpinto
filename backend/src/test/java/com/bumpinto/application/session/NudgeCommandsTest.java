package com.bumpinto.application.session;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.TooManyRequestsException;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NudgeCommandsTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    final FakeStores.InMemorySessionStore store = new FakeStores.InMemorySessionStore();
    final FakeStores.RecordingEvents events = new FakeStores.RecordingEvents();
    UUID sessionId;
    UUID mehmet;
    UUID ayse;
    NudgeCommands nudges;
    /** Sahte kotanın TÜKETİLEN anahtarları: "kota hiç sorulmadı"nın tek kanıtı bunun boş olması. */
    final Set<String> used = new HashSet<>();

    @BeforeEach
    void setUp() {
        Session s = store.saveSession(new Session(UUID.randomUUID(), "s1", UUID.randomUUID(),
                "Cuma", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                T0.plusSeconds(3600), null, List.of()));
        sessionId = s.id();
        mehmet = seat("Mehmet", true, false);
        ayse = seat("Ayşe", false, false);
        nudges = new NudgeCommands(store, events, (from, to, window) -> used.add(from + ":" + to),
                Clock.fixed(T0, ZoneOffset.UTC));
    }

    private UUID seat(String name, boolean host, boolean manual) {
        UUID id = UUID.randomUUID();
        store.saveParticipant(new Participant(id, sessionId, name, null, host, null, manual,
                null, TravelMode.CAR));
        return id;
    }

    @Test
    void nudgePublishesTheEventWithBothIds() {
        nudges.nudge("s1", mehmet, ayse);

        FakeStores.Published published = events.published.get(0);
        assertThat(published.slug()).isEqualTo("s1");
        SessionEvent event = published.event();
        assertThat(event.type()).isEqualTo("nudged");
        assertThat(event.payload()).containsEntry("fromParticipantId", mehmet.toString())
                .containsEntry("toParticipantId", ayse.toString());
    }

    @Test
    void secondNudgeWithinTheWindowIs429() {
        nudges.nudge("s1", mehmet, ayse);

        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, ayse))
                .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void nudgingYourselfAManualPointOrAStrangerIsForbidden() {
        UUID point = seat("Ev", false, true);

        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, mehmet))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, point))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    /**
     * Reddedilen dürt kotayı TÜKETMEZ: yasak bir hedefe basmak meşru zili de susturmamalı.
     *
     * <p>Kanıt "sonraki dürt geçti" DEĞİL, kotanın HİÇ sorulmamış olmasıdır: sahte kota
     * (gönderen, hedef) çiftine anahtarlı olduğu için `mehmet→mehmet` ile `mehmet→ayşe` zaten
     * ayrı kovalardır ve sonuca bakan bir iddia, `tryNudge` doğrulama zincirinin ÖNÜNE taşınsa
     * bile geçerdi — yani korumak istediği regresyonu hiç görmezdi.
     */
    @Test
    void aRejectedNudgeDoesNotSpendTheQuota() {
        assertThatThrownBy(() -> nudges.nudge("s1", mehmet, mehmet))
                .isInstanceOf(ForbiddenException.class);
        assertThat(used).isEmpty();

        nudges.nudge("s1", mehmet, ayse);

        assertThat(used).containsExactly(mehmet + ":" + ayse);
        assertThat(events.published).hasSize(1);
    }
}
