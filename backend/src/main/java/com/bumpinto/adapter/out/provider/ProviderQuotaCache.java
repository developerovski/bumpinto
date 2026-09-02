package com.bumpinto.adapter.out.provider;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Saglayici → son bilinen kota. Uc yazar var: scheduler (PROBE/BUDGET), saglayicilarin
 * kendisi (her gercek yanittan HEADER — bedava ve en taze) ve orkestrator (429 → EXHAUSTED).
 *
 * <p>Surec ici: pod yeniden basladiginda bosalir, ilk scheduler turu doldurur. Bos oldugu
 * kisa pencerede orkestrator {@code @Order} sirasina duser — kotasiz secim, kararsiz degil.
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
