package com.bumpinto.application.error;

import java.time.Duration;

/**
 * Kota asimi. {@code retryAfter} varsa istemciye {@code Retry-After} olarak gider: SAATLIK bir
 * kotaya "60 sn sonra dene" demek yeniden deneme firtinasidir (RateLimitFilter'da ayni kural).
 * Bilinmiyorsa null — uydurma bir sure basmaktansa basligi hic gonderme.
 */
public class TooManyRequestsException extends RuntimeException {

    private final transient Duration retryAfter;

    public TooManyRequestsException(String message) {
        this(message, null);
    }

    public TooManyRequestsException(String message, Duration retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }

    public Duration retryAfter() {
        return retryAfter;
    }
}
