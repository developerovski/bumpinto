package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.venue.ProviderQuota;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/** Kaynaklarin paylastigi HTTP isleri. KALITIM DEGIL bilesim (spec §3). */
@Component
public class VenueSourceSupport {

    private final UnirestInstance http;

    public VenueSourceSupport(UnirestInstance http) {
        this.http = http;
    }

    public UnirestInstance http() {
        return http;
    }

    /** 2xx degilse ProviderException; 429 cagirana birakilir (siniflandirma kaynaga ozel). */
    public void requireSuccess(HttpResponse<?> response, String sourceId) {
        if (!response.isSuccess()) {
            throw new ProviderException(sourceId + " returned " + response.getStatus());
        }
    }

    /** {@code x-ratelimit-*} basliklarindan kota; basliklar yoksa veya bozuksa null. */
    public ProviderQuota rateLimitQuota(HttpResponse<?> response, String sourceId, Clock clock) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String remaining = response.getHeaders().getFirst("x-ratelimit-remaining");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        Instant now = clock.instant();
        long limitValue = parseOr(limit, -1);
        long remainingValue = parseOr(remaining, -1);
        if (limitValue < 0 || remainingValue < 0) {
            return null;
        }
        Instant resetAt = Instant.ofEpochSecond(parseOr(reset, now.plus(Duration.ofHours(1)).getEpochSecond()));
        return new ProviderQuota(sourceId, limitValue, remainingValue,
                resetAt, now, ProviderQuota.Source.HEADER);
    }

    /** Basliklar cogu zaman sayidir ama garanti degil; bozuksa fallback. */
    private static long parseOr(String s, long fallback) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    /** Bos dize -> null: "veri yokken bos etiket" yasak (spec §4.9). */
    public static String text(JSONObject json, String key) {
        String value = json.optString(key, "");
        return value.isBlank() ? null : value;
    }

    public static JSONObject firstObject(JSONObject json, String key) {
        JSONArray array = json.optJSONArray(key);
        return array == null || array.isEmpty() ? null : array.optJSONObject(0);
    }

    public static Double number(JSONObject json, String key) {
        return json.has(key) && !json.isNull(key) ? json.optDouble(key) : null;
    }
}
