package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.RemovalCause;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;

/**
 * Surec ici ses odalari (InMemoryPresence deseni). Restart'ta bosalir: sohbet biter, host
 * yeniden acar (spec K8). Sure dolumu TaskScheduler'da: close() zamanlayiciyi iptal eder.
 *
 * <p>10k/25 saat sinirlari yalniz yedek: odalar normalde close() veya 2 saatlik zamanlayici ile
 * oluyor, Caffeine sinirina neredeyse hic ulasilmiyor. Iki degismez: gelecek (future) her zaman
 * Entry'nin icinde tasinir — update() onu degismeden bir sonraki Entry'ye aktarmali; onExpire
 * close()'u cagirmasi beklenir ve firlatmamalidir — firlayan bir geri cagri odayi zamanlayicisiz
 * birakir.
 */
@Component
public class InMemoryVoiceRooms implements VoiceRoomsPort {

    private record Entry(VoiceRoom room, ScheduledFuture<?> expiry) {
    }

    private final Cache<UUID, Entry> rooms;
    private final Clock clock;
    private final TaskScheduler scheduler;

    // Iki ctor'dan Spring'in ikisi arasinda tereddut etmemesi icin: paket-private test ctor'u
    // eklenince "tek ctor var, otomatik ona enjekte et" kisayolu artik gecerli degil.
    @Autowired
    public InMemoryVoiceRooms(Clock clock, TaskScheduler scheduler) {
        this(clock, scheduler, 10_000);
    }

    /** Testte kucuk bir maximumSize ile tahliyenin (eviction) zamanlayiciyi iptal ettigini gormek icin. */
    InMemoryVoiceRooms(Clock clock, TaskScheduler scheduler, long maximumSize) {
        this.clock = clock;
        this.scheduler = scheduler;
        this.rooms = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterAccess(Duration.ofHours(25))
                // Runnable::run: Caffeine bakim/tahliye bildirimini varsayilan olarak commonPool'a
                // gonderir, bu da testte "iptal edildi mi" sorusunu belirsiz kilar; burada tek is
                // bir cancel() cagrisi oldugundan bu thread'de calismasi maliyetsizdir.
                .executor(Runnable::run)
                .evictionListener((UUID key, Entry entry, RemovalCause cause) -> entry.expiry().cancel(false))
                .build();
    }

    @Override
    public VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire) {
        return rooms.asMap().computeIfAbsent(sessionId, key -> {
            VoiceRoom room = new VoiceRoom(sessionId, slug, clock.instant(), endsAt, Map.of());
            return new Entry(room, scheduler.schedule(onExpire, endsAt));
        }).room();
    }

    @Override
    public Optional<VoiceRoom> close(UUID sessionId) {
        Entry removed = rooms.asMap().remove(sessionId);
        if (removed == null) {
            return Optional.empty();
        }
        removed.expiry().cancel(false);
        return Optional.of(removed.room());
    }

    @Override
    public Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat) {
        return update(sessionId, members -> {
            members.put(participantId, seat);
            return true;
        });
    }

    @Override
    public Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId) {
        return update(sessionId, members -> members.entrySet().removeIf(e ->
                e.getValue().wsSessionId().equals(wsSessionId)
                        && e.getValue().subscriptionId().equals(subscriptionId)));
    }

    @Override
    public Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId) {
        return update(sessionId, members -> members.entrySet().removeIf(e ->
                e.getValue().wsSessionId().equals(wsSessionId)));
    }

    @Override
    public Optional<VoiceRoom> roomOf(UUID sessionId) {
        Entry entry = rooms.getIfPresent(sessionId);
        return entry == null ? Optional.empty() : Optional.of(entry.room());
    }

    /** Uye haritasini atomik gunceller; mutate false donerse degisiklik yoktur → bos. */
    private Optional<VoiceRoom> update(UUID sessionId, Predicate<Map<UUID, Seat>> mutate) {
        AtomicReference<VoiceRoom> updated = new AtomicReference<>();
        rooms.asMap().computeIfPresent(sessionId, (key, entry) -> {
            Map<UUID, Seat> members = new HashMap<>(entry.room().members());
            if (!mutate.test(members)) {
                return entry;
            }
            VoiceRoom room = entry.room();
            updated.set(new VoiceRoom(room.sessionId(), room.slug(), room.startedAt(), room.endsAt(), members));
            return new Entry(updated.get(), entry.expiry());
        });
        return Optional.ofNullable(updated.get());
    }
}
