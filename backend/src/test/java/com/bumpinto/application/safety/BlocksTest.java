package com.bumpinto.application.safety;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlocksTest {

    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");

    final FakeStores.InMemoryBlockStore store = new FakeStores.InMemoryBlockStore();
    final FakeStores.InMemorySessionStore sessions = new FakeStores.InMemorySessionStore();
    final FakeStores.RecordingEvents events = new FakeStores.RecordingEvents();
    final UUID me = UUID.randomUUID();
    final Session session = sessions.saveSession(new Session(UUID.randomUUID(), "slug-1", me,
            "Kahve", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
            NOW.plus(Duration.ofHours(24)), null, List.of(), null, null, null, null, null));
    final Blocks blocks = new Blocks(store, sessions, events, Clock.fixed(NOW, ZoneOffset.UTC));

    Participant seat(UUID owner) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), session.id(), "Kisi",
                null, false, null, false, null, TravelMode.CAR, owner));
    }

    List<Participant> roster() {
        return sessions.participantsOf(session.id());
    }

    @Test
    void rosterBlockIsOneWayButTheVoiceRuleIsMutual() {
        UUID other = UUID.randomUUID();
        Participant them = seat(other);
        Participant mySeat = seat(me);

        blocks.add(me, other, null, null);

        assertThat(blocks.hiddenParticipantIds(me, session.id(), roster()))
                .containsExactly(them.id());
        // Karsi taraf hicbir isaret gormez (engel bir mesaj degildir)...
        assertThat(blocks.hiddenParticipantIds(other, session.id(), roster())).isEmpty();
        // ...ama ses odasi kurali iki yonludur.
        assertThat(blocks.blockedPairIds(session.id(), them.id(), roster()))
                .containsExactly(mySeat.id());
    }

    /** Anonim koltuk (user_id null) YALNIZ o oturum boyunca engellenir. */
    @Test
    void anonymousParticipantBlockIsSessionScopedAndRingsTheRosterBell() {
        Participant anon = seat(null);

        blocks.add(me, null, anon.id(), "slug-1");

        assertThat(blocks.hiddenParticipantIds(me, session.id(), roster()))
                .containsExactly(anon.id());
        assertThat(blocks.hiddenParticipantIds(me, UUID.randomUUID(), List.of())).isEmpty();
        assertThat(events.published).extracting(p -> p.event().type()).contains("blocked");
    }

    @Test
    void removingSomeoneElsesBlockIsForbidden() {
        UUID id = blocks.add(me, UUID.randomUUID(), null, null).id();

        assertThatThrownBy(() -> blocks.remove(UUID.randomUUID(), id))
                .isInstanceOf(ForbiddenException.class);
    }
}
