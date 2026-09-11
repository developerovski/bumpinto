package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.domain.voice.VoiceRoom;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.FakeStores;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VoiceCommandsTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);
    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    /** Clock.fixed ilerlemez; kalan sure ve expiry icin ilerleyen saat gerekir. */
    static final class MutableClock extends Clock {
        Instant now = T0;

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override public Instant instant() {
            return now;
        }
    }

    static AppProps props() {
        return TestProps.defaults();
    }

    MutableClock clock;
    FakeStores.InMemorySessionStore store;
    FakeStores.RecordingEvents events;
    FakeStores.FakeVoiceRooms rooms;
    FakeStores.FakePresence presence;
    List<Duration> issuedTtls;
    SessionCommands sessions;
    VoiceCommands voice;
    String slug;
    UUID sessionId;
    UUID host;
    UUID guest;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        store = new FakeStores.InMemorySessionStore();
        events = new FakeStores.RecordingEvents();
        rooms = new FakeStores.FakeVoiceRooms();
        presence = new FakeStores.FakePresence();
        issuedTtls = new ArrayList<>();
        TurnCredentialsPort turn = ttl -> {
            issuedTtls.add(ttl);
            return IceConfig.stunOnly();
        };
        sessions = new SessionCommands(store, events, new FakeStores.FakeReverseGeocoder(), clock);
        voice = new VoiceCommands(store, rooms, turn, events, clock, props(), presence);
        SessionCommands.CreateSessionResult created = sessions.createSession(UUID.randomUUID(),
                "Cuma", List.of(ActivityType.COFFEE), SessionType.GROUP, DEN_BOSCH, "Mehmet",
                null, null, null);
        slug = created.session().slug();
        sessionId = created.session().id();
        host = created.hostParticipant().id();
        Participant ayse = sessions.join(slug, Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null);
        guest = ayse.id();
        events.published.clear();
    }

    private String lastEventType() {
        return events.published.get(events.published.size() - 1).event().type();
    }

    @Test
    void hostOpensTheRoomForTwoHoursAndASecondStartIsIdempotent() {
        VoiceRoom room = voice.start(slug, host);

        assertThat(room.endsAt()).isEqualTo(T0.plus(Duration.ofHours(2)));
        assertThat(lastEventType()).isEqualTo("voice_started");
        assertThat(events.published.get(0).event().payload())
                .containsEntry("endsAt", "2026-09-06T12:00:00Z");

        assertThat(voice.start(slug, host)).isEqualTo(room);
        assertThat(events.published).hasSize(1);
    }

    @Test
    void onlyTheHostStartsOrEnds() {
        assertThatThrownBy(() -> voice.start(slug, guest)).isInstanceOf(ForbiddenException.class);
        voice.start(slug, host);
        assertThatThrownBy(() -> voice.end(slug, guest)).isInstanceOf(ForbiddenException.class);
        assertThat(rooms.roomOf(sessionId)).isPresent();
    }

    @Test
    void soloSessionsHaveNoVoice() {
        SessionCommands.CreateSessionResult solo = sessions.createSession(UUID.randomUUID(),
                "Tek", List.of(ActivityType.COFFEE), SessionType.SOLO, DEN_BOSCH, "Mehmet",
                null, null, null);

        assertThatThrownBy(() -> voice.start(solo.session().slug(), solo.hostParticipant().id()))
                .isInstanceOf(ConflictException.class).hasMessageContaining("group");
    }

    @Test
    void expiredSessionsCannotStartButTheHostCanStillEnd() {
        voice.start(slug, host);
        clock.advance(Duration.ofHours(25));

        assertThatThrownBy(() -> voice.start(slug, host)).isInstanceOf(ConflictException.class);
        voice.end(slug, host);
        assertThat(rooms.roomOf(sessionId)).isEmpty();
    }

    @Test
    void endOnAnUnknownSlugIsNotFound() {
        assertThatThrownBy(() -> voice.end("nope", host)).isInstanceOf(NotFoundException.class);
    }

    /** Zamanlayici ile start arasindaki dar pencere: suresi gecmis oda taze acilir, once TIME_LIMIT gider. */
    @Test
    void startAfterEndsAtReplacesTheStaleRoom() {
        VoiceRoom first = voice.start(slug, host);
        clock.advance(Duration.ofHours(2).plusSeconds(1));

        VoiceRoom second = voice.start(slug, host);

        assertThat(second.endsAt()).isAfter(first.endsAt());
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "TIME_LIMIT");
        assertThat(lastEventType()).isEqualTo("voice_started");
    }

    /** Eski zamanlayici, yenisi kurulduktan sonra ates alirsa DEGISTIRILEN odayi kapatmamali. */
    @Test
    void aStaleTimerDoesNotCloseTheReplacementRoom() {
        voice.start(slug, host);
        Runnable stale = rooms.expiries.get(sessionId);
        clock.advance(Duration.ofHours(2).plusSeconds(1));

        VoiceRoom second = voice.start(slug, host);
        stale.run();

        assertThat(rooms.roomOf(sessionId)).contains(second);
        assertThat(lastEventType()).isEqualTo("voice_started");
    }

    /** Oda oturumu asamaz (spec §6): 24s'lik oturumun son saatinde acilan oda da ayni anda biter. */
    @Test
    void roomNeverOutlivesTheSession() {
        clock.advance(Duration.ofHours(23));

        VoiceRoom room = voice.start(slug, host);

        assertThat(room.endsAt()).isEqualTo(T0.plus(Duration.ofHours(24)));
        voice.credentials(slug, host);
        assertThat(issuedTtls).containsExactly(Duration.ofHours(1).plusSeconds(60));
    }

    @Test
    void endPublishesTheHostReasonOnceAndIsIdempotent() {
        voice.start(slug, host);
        voice.end(slug, host);
        voice.end(slug, host);

        assertThat(events.published).hasSize(2);
        assertThat(lastEventType()).isEqualTo("voice_ended");
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "HOST");
    }

    @Test
    void theExpiryCallbackEndsWithTimeLimit() {
        voice.start(slug, host);
        rooms.expire(sessionId);

        assertThat(rooms.roomOf(sessionId)).isEmpty();
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "TIME_LIMIT");
    }

    @Test
    void endIfEmptyClosesAnOpenRoomAndIsSilentOtherwise() {
        voice.endIfEmpty(sessionId);
        assertThat(events.published).isEmpty();

        voice.start(slug, host);
        presence.arrived(sessionId, host, "ws-1");
        voice.endIfEmpty(sessionId);
        assertThat(rooms.roomOf(sessionId)).isPresent();
        assertThat(events.published).hasSize(1); // biri hala icerde, yalniz voice_started

        presence.left(sessionId, host, "ws-1");
        voice.endIfEmpty(sessionId);
        assertThat(events.published.get(1).slug()).isEqualTo(slug);
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "EMPTY");
    }

    @Test
    void credentialsNeedAnOpenRoomAndAParticipantOfThisSession() {
        assertThatThrownBy(() -> voice.credentials(slug, guest))
                .isInstanceOf(ConflictException.class).hasMessageContaining("voice not active");
        voice.start(slug, host);
        assertThatThrownBy(() -> voice.credentials(slug, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);

        VoiceCommands.Credentials c = voice.credentials(slug, guest);

        assertThat(c.endsAt()).isEqualTo(T0.plus(Duration.ofHours(2)));
        assertThat(c.ice().relay()).isFalse();
        assertThat(issuedTtls).containsExactly(Duration.ofHours(2).plusSeconds(60));
    }

    @Test
    void credentialTtlShrinksWithTheRoom() {
        voice.start(slug, host);
        clock.advance(Duration.ofMinutes(90));

        voice.credentials(slug, host);

        assertThat(issuedTtls).containsExactly(Duration.ofMinutes(30).plusSeconds(60));
    }

    @Test
    void credentialsAreRefusedOnAnExpiredSession() {
        voice.start(slug, host);
        clock.advance(Duration.ofHours(25));

        assertThatThrownBy(() -> voice.credentials(slug, host)).isInstanceOf(ConflictException.class);
    }

    @Test
    void maxDurationMustBePositive() {
        AppProps zeroVoice = TestProps.withVoice(new AppProps.Voice(Duration.ZERO));

        assertThatThrownBy(() -> new VoiceCommands(store, rooms,
                ttl -> IceConfig.stunOnly(), events, clock, zeroVoice, presence))
                .isInstanceOf(IllegalStateException.class);
    }

    /** Zamanlayici compute icinde kurulur; sifira yakin omur odayi zamanlayicisiz birakabilir. */
    @Test
    void startRefusesASessionThatExpiresWithinFiveSeconds() {
        clock.advance(Duration.ofHours(24).minusSeconds(3));

        assertThatThrownBy(() -> voice.start(slug, host)).isInstanceOf(ConflictException.class);
    }
}
