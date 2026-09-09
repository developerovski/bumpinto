package com.bumpinto.adapter.out.quota;

import com.bumpinto.domain.port.AccountQuotaPort;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Surec ici kota (InMemoryNudgeCooldown ile ayni sinif borc): cok pod'da paylasilmaz, restart'ta
 * sifirlanir. Bedeli en kotu ihtimalle pod sayisi kadar fazla dosya; alternatifi her aktarmada
 * bir INSERT olurdu. Cok pod'a gecilirse ikisi birlikte Redis'e tasinir (spec §3).
 */
@Component
public class InMemoryAccountQuota implements AccountQuotaPort {

    /**
     * TTL pencereden TURETILIR: erken tahliye edilen kayit bedava bir sifirlamadir ve saatlik
     * bir kotayi dakikalik yapardi (RateLimitFilter'da ayni hata bir kez yasandi — K-B32 komsu
     * satiri). Kayit "son tuketim ani"dir, o yuzden expireAfterWrite: surekli dovulen bir
     * anahtar erisimle uzatilmamali.
     */
    private static final Duration EVICTION_MARGIN = Duration.ofMinutes(10);

    private final Cache<String, Instant> lastUse = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(Duration.ofDays(1).plus(EVICTION_MARGIN))
            .build();

    private final Clock clock;

    public InMemoryAccountQuota(Clock clock) {
        this.clock = clock;
    }

    /**
     * Hak verilip verilmedigi compute'un ICINDE isaretlenir: ayni tik icinde gelen ikinci istek,
     * korunan damga {@code now}'a esit oldugu icin bedava bir hak kazanirdi (cift dokunus).
     */
    @Override
    public boolean tryConsume(String quotaId, UUID accountId, Duration window) {
        String key = quotaId + ":" + accountId;
        Instant now = clock.instant();
        AtomicBoolean granted = new AtomicBoolean();
        lastUse.asMap().compute(key, (k, previous) -> {
            if (previous != null && previous.plus(window).isAfter(now)) {
                return previous; // pencere hala acik: hak yok, damga da tazelenmez
            }
            granted.set(true);
            return now;
        });
        return granted.get();
    }
}
