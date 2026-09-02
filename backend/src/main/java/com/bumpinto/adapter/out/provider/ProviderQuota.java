package com.bumpinto.adapter.out.provider;

import java.time.Instant;

/**
 * Bir saglayicinin o anki kota durumu — kaynak ne olursa olsun tek bicim.
 *
 * <p>Saglayicilarin telemetrisi esit degil (2026-09-02 arastirmasi): FSQ her yanitta
 * {@code x-ratelimit-*} verir, Google hic header vermez (kota yalniz Cloud Monitoring'de,
 * dakikalar gecikmeli), TripAdvisor'da ne header ne API var. Orkestrator bu farki gormesin
 * diye her sinyal buraya indirgenir; {@link Source} yalniz teshis icindir.
 *
 * @param limit     donem icindeki toplam hak (0 = bilinmiyor/kredi yok)
 * @param remaining kalan hak
 * @param resetAt   kotanin yenilenecegi an; {@code remaining == 0} iken saglayici bu ana
 *                  kadar secilmez
 */
public record ProviderQuota(String provider, long limit, long remaining, Instant resetAt,
                            Instant measuredAt, Source source) {

    public enum Source {
        /** Gercek bir aramanin yanit basliklarindan — bedava, en taze. */
        HEADER,
        /** Scheduler'in yalniz kota okumak icin attigi minimal istek — ucretli olabilir. */
        PROBE,
        /** Yerel sayac: yapilandirilmis aylik butce − yapilan cagri (Google). */
        BUDGET,
        /** 429 sonrasi orkestratorun koydugu "kapali" isareti. */
        EXHAUSTED
    }

    public static ProviderQuota exhausted(String provider, Instant until, Instant now) {
        return new ProviderQuota(provider, 0, 0, until, now, Source.EXHAUSTED);
    }

    /** Bu anda secilebilir mi: hak var ya da yenilenme ani gecti. */
    public boolean available(Instant now) {
        return remaining > 0 || !now.isBefore(resetAt);
    }

    /** 0..1 — orkestratorun siralama olcusu. Limit bilinmiyorsa 0. */
    public double ratio() {
        return limit <= 0 ? 0 : Math.min(1.0, (double) remaining / limit);
    }

    public boolean isFresherThan(Instant threshold) {
        return measuredAt.isAfter(threshold);
    }
}
