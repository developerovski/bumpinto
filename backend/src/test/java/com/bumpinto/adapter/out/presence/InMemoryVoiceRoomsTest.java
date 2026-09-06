package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.scheduling.TaskScheduler;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class InMemoryVoiceRoomsTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    static final Instant ENDS = T0.plus(Duration.ofHours(2));

    TaskScheduler scheduler;
    ScheduledFuture<?> future;
    InMemoryVoiceRooms rooms;
    UUID session;
    UUID ayse;
    UUID mehmet;

    @BeforeEach
    void setUp() {
        scheduler = mock(TaskScheduler.class);
        future = mock(ScheduledFuture.class);
        doReturn(future).when(scheduler).schedule(any(Runnable.class), any(Instant.class));
        rooms = new InMemoryVoiceRooms(Clock.fixed(T0, ZoneOffset.UTC), scheduler);
        session = UUID.randomUUID();
        ayse = UUID.randomUUID();
        mehmet = UUID.randomUUID();
    }

    @Test
    void openSchedulesExpiryAtEndsAtAndIsIdempotent() {
        AtomicInteger expired = new AtomicInteger();
        VoiceRoom first = rooms.open(session, "s1", ENDS, expired::incrementAndGet);
        VoiceRoom again = rooms.open(session, "s1", ENDS.plusSeconds(1), expired::incrementAndGet);

        assertThat(again).isEqualTo(first);
        assertThat(first.startedAt()).isEqualTo(T0);
        ArgumentCaptor<Runnable> task = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(task.capture(), eq(ENDS));
        task.getValue().run();
        assertThat(expired.get()).isEqualTo(1);
    }

    @Test
    void closeCancelsTheTimerAndForgetsTheRoom() {
        rooms.open(session, "s1", ENDS, () -> { });

        assertThat(rooms.close(session)).isPresent();
        verify(future).cancel(false);
        assertThat(rooms.roomOf(session)).isEmpty();
        assertThat(rooms.close(session)).isEmpty();
        assertThat(rooms.leaveSocket(session, "ws-1")).isEmpty();
        assertThat(rooms.leaveSeat(session, "ws-1", "sub-1")).isEmpty();
    }

    @Test
    void reopenAfterCloseSchedulesAFreshTimer() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.close(session);
        Instant laterEnds = ENDS.plus(Duration.ofHours(2));
        VoiceRoom reopened = rooms.open(session, "s1", laterEnds, () -> { });

        verify(scheduler, times(2)).schedule(any(Runnable.class), any(Instant.class));
        assertThat(reopened.endsAt()).isEqualTo(laterEnds);
    }

    @Test
    void joiningAgainWithTheSameSeatStillReportsTheRoom() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.join(session, ayse, new Seat("ws-1", "sub-1"));

        assertThat(rooms.join(session, ayse, new Seat("ws-1", "sub-1"))).isPresent();
        assertThat(rooms.roomOf(session).orElseThrow().memberIds()).hasSize(1);
    }

    @Test
    void joinNeedsAnOpenRoom() {
        assertThat(rooms.join(session, ayse, new Seat("ws-1", "sub-1"))).isEmpty();
        verify(scheduler, never()).schedule(any(Runnable.class), any(Instant.class));
    }

    @Test
    void aNewerSeatReplacesTheOlderOneAndOnlyTheOwnerSeatLeaves() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.join(session, ayse, new Seat("ws-1", "sub-1"));
        rooms.join(session, ayse, new Seat("ws-2", "sub-9"));

        // eski soketin kopmasi yeni koltugu dusurmez
        assertThat(rooms.leaveSocket(session, "ws-1")).isEmpty();
        assertThat(rooms.roomOf(session).orElseThrow().hasMember(ayse)).isTrue();
        // ayni sokette baska bir abonelik id'si de dusurmez
        assertThat(rooms.leaveSeat(session, "ws-2", "sub-1")).isEmpty();
        assertThat(rooms.leaveSeat(session, "ws-2", "sub-9")).isPresent();
        assertThat(rooms.roomOf(session).orElseThrow().memberIds()).isEmpty();
    }

    /**
     * Caffeine'in maximumSize'la HANGI girdiyi tuttugu (TinyLfu) garanti degildir, bu yuzden
     * belirli bir future degil EN AZ birinin iptal edildigi sayilir — expireAfterAccess + test
     * Ticker'i denendi ama maximumSize burada zaten yeterince deterministik (senkron tahliye).
     */
    @Test
    void evictionCancelsTheTimer() {
        ScheduledFuture<?> future2 = mock(ScheduledFuture.class);
        AtomicInteger cancelled = new AtomicInteger();
        doAnswer(inv -> cancelled.incrementAndGet() > 0).when(future).cancel(false);
        doAnswer(inv -> cancelled.incrementAndGet() > 0).when(future2).cancel(false);
        doReturn(future).doReturn(future2).when(scheduler).schedule(any(Runnable.class), any(Instant.class));
        InMemoryVoiceRooms tiny = new InMemoryVoiceRooms(Clock.fixed(T0, ZoneOffset.UTC), scheduler, 1);

        tiny.open(session, "s1", ENDS, () -> { });
        tiny.open(mehmet, "s2", ENDS, () -> { });

        assertThat(cancelled.get()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void disconnectDropsEverySeatOfThatSocket() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.join(session, ayse, new Seat("ws-1", "sub-1"));
        rooms.join(session, mehmet, new Seat("ws-2", "sub-2"));

        assertThat(rooms.leaveSocket(session, "ws-1").orElseThrow().memberIds()).containsExactly(mehmet);
    }
}
