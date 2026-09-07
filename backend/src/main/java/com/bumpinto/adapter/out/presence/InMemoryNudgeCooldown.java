package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.port.NudgeCooldownPort;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Surec ici kota (InMemoryPresence ile ayni sinif borc): cok pod'da paylasilmaz, restart'ta
 * sifirlanir. Bedeli en kotu ihtimalle pod sayisi kadar fazla zil; alternatifi her durtude
 * bir INSERT olurdu.
 */
@Component
public class InMemoryNudgeCooldown implements NudgeCooldownPort {

    /**
     * expireAfterWrite (erisimden DEGIL): kayit "son durtme ani"dir ve pencere yazmayla baslar.
     * 10 dk en uzun makul pencerenin kat kat ustunde; tek isi terk edilmis ciftlerin birikmesini
     * onlemek.
     */
    private final Cache<String, Instant> lastNudge = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .build();

    private final Clock clock;

    public InMemoryNudgeCooldown(Clock clock) {
        this.clock = clock;
    }

    /**
     * Karar, KORUNAN degeri {@code now}'a esitleyerek okunamaz: ayni tik icinde gelen ikinci
     * durtude korunan onceki damga da {@code now}'a esittir ve cift-dokunus bedava bir zil
     * kazanirdi (saat cozunurlugu milisaniye olan bir platformda gercek bir acik). Hak verilip
     * verilmedigi bu yuzden compute'un ICINDE, tek atomik adimda isaretlenir.
     */
    @Override
    public boolean tryNudge(UUID fromParticipantId, UUID toParticipantId, Duration window) {
        String key = fromParticipantId + ":" + toParticipantId;
        Instant now = clock.instant();
        AtomicBoolean granted = new AtomicBoolean();
        lastNudge.asMap().compute(key, (k, previous) -> {
            if (previous != null && previous.plus(window).isAfter(now)) {
                return previous; // pencere hala acik: hak yok, damga da tazelenmez
            }
            granted.set(true);
            return now;
        });
        return granted.get();
    }
}
