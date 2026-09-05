package com.bumpinto.adapter.out.provider;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Saglayici → son bilinen kota. Iki yazar var, IKISI DE BEDAVA: saglayicilarin kendisi (her
 * gercek yanittan HEADER) ve orkestrator (429 → EXHAUSTED). Kota okumak icin ayrica istek
 * atan bir yazar YOK — o is scheduler'la birlikte kaldirildi.
 *
 * <p>Surec ici: pod yeniden basladiginda bosalir ve ilk gercek arama doldurur. Bos oldugu
 * pencerede tek sonuc, kotasi tukenmis saglayicinin elenmemesidir; SIRA zaten kotadan
 * bagimsizdir ({@code @Order}), yani secim hicbir zaman kararsiz degildir.
 */
@Component
public class ProviderQuotaCache {

    private final Map<String, ProviderQuota> quotas = new ConcurrentHashMap<>();

    public void record(ProviderQuota quota) {
        // EXHAUSTED isareti daha taze bir HEADER'la ezilebilir — o zaten gercek bir yanittir.
        quotas.put(quota.provider(), quota);
    }

    public void exhaust(String provider, Instant until, Instant now) {
        quotas.put(provider, ProviderQuota.exhausted(provider, until, now));
    }

    public Optional<ProviderQuota> get(String provider) {
        return Optional.ofNullable(quotas.get(provider));
    }

    /** Teshis/gozlem icin anlik kopya. */
    public Map<String, ProviderQuota> snapshot() {
        return Map.copyOf(quotas);
    }
}
