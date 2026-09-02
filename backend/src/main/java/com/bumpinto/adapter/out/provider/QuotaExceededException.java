package com.bumpinto.adapter.out.provider;

import java.time.Instant;

/**
 * Saglayici kotasi/kredisi bitti (HTTP 429). Gecici bir aksaklik DEGIL: ayni saglayiciya
 * hemen tekrar gitmek anlamsizdir. {@link ProviderOrchestrator} bunu gorunce saglayiciyi
 * {@link #resetAt()} anina kadar devre disi birakir; diger {@link ProviderException}'lar
 * yalniz o cagriyi dusurur.
 */
public class QuotaExceededException extends ProviderException {

    private final Instant resetAt;

    public QuotaExceededException(String message, Instant resetAt) {
        super(message);
        this.resetAt = resetAt;
    }

    /** Kotanin yenilenecegi an — saglayici soyluyorsa o, soylemiyorsa adaptorun tahmini. */
    public Instant resetAt() {
        return resetAt;
    }
}
