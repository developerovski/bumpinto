package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.port.PresencePort;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Surec ici presence. Cok pod'da paylasilmaz, restart'ta bosalir — ProviderQuotaCache ile ayni
 * sinif borc.
 *
 * <p>Sayac DEGIL, acik WS baglantilarinin KIMLIK KUMESI tutulur: ayni kisi iki sekme acabilir ve
 * birinin kapanmasi onu cevrimdisi yapmamalidir. Kume sayaca gore fazladan bir garanti verir:
 * eslesmeyen bir left (arrived hic gelmemis bir wsSessionId — orn. HTTP handshake tamamlanip
 * STOMP CONNECT'i hic gondermeden kapanan bir soket; React StrictMode'un gelistirmede yaptigi
 * cift-mount tam olarak bunu tetikler) kumede olmayan bir elemani silmeye calisir ve NO-OP olur.
 * Sayacta ayni durum saglikli ikinci sekmeyi sifira dusurup kisiyi 45 sn sonra yanlislikla
 * cevrimdisi gosterirdi.
 *
 * <p>Dis harita Caffeine: oturum basina bos bir harita sonsuza kadar birikmesin diye erisimden
 * 25 saat sonra (oturum TTL'i 24 saat) dusulur. Ic harita okuma sirasinda budanir — ayri bir
 * zamanlanmis is acmaya degmedi.
 */
@Component
public class InMemoryPresence implements PresencePort {

    /** Kopma toleransi: sayfa yenileme (~1 sn) ve kisa ag kesintisi kisiyi cevrimdisi yapmaz. */
    static final Duration GRACE = Duration.ofSeconds(45);

    private record Seat(Set<String> connections, Instant lastSeenAt) {
    }

    private final Cache<UUID, Map<UUID, Seat>> seats = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(25))
            .build();

    private final Clock clock;

    public InMemoryPresence(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void arrived(UUID sessionId, UUID participantId, String wsSessionId) {
        seats.get(sessionId, key -> new ConcurrentHashMap<>())
                .compute(participantId, (key, seat) -> {
                    Set<String> connections = seat == null
                            ? new HashSet<>() : new HashSet<>(seat.connections());
                    connections.add(wsSessionId);
                    return new Seat(Set.copyOf(connections), clock.instant());
                });
    }

    @Override
    public void left(UUID sessionId, UUID participantId, String wsSessionId) {
        Map<UUID, Seat> session = seats.getIfPresent(sessionId);
        if (session == null) {
            return;
        }
        session.computeIfPresent(participantId, (key, seat) -> {
            if (!seat.connections().contains(wsSessionId)) {
                return seat; // eslesmeyen left: bu soket icin arrived hic gelmemisti, no-op
            }
            Set<String> connections = new HashSet<>(seat.connections());
            connections.remove(wsSessionId);
            return new Seat(Set.copyOf(connections), clock.instant());
        });
    }

    @Override
    public Set<UUID> presentIn(UUID sessionId) {
        Map<UUID, Seat> session = seats.getIfPresent(sessionId);
        if (session == null) {
            return Set.of();
        }
        Instant floor = clock.instant().minus(GRACE);
        Set<UUID> present = new HashSet<>();
        session.forEach((participantId, seat) -> {
            if (!seat.connections().isEmpty() || seat.lastSeenAt().isAfter(floor)) {
                present.add(participantId);
            } else {
                // Kosullu silme: arada yeniden baglanmis bir koltugu dusurmez.
                session.remove(participantId, seat);
            }
        });
        return Set.copyOf(present);
    }
}
