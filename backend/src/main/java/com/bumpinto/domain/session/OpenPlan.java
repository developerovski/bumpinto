package com.bumpinto.domain.session;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Acik plan: oturumun Kesfet'te listelenen varyanti. {@code Session.openPlan == null} ise oturum
 * GIZLIDIR (bugunku davet-linkli oturum) — bayrak alani yok, varligin kendisi bayraktir.
 *
 * <p>Kesin bulusma NOKTASI burada DEGIL ({@code anchor}/{@code decidedVenueId} tasir); bu kayit
 * yalniz zaman, kapasite ve katilim kuralidir. Kurallar (siniri, yeter sayi, TTL) sorguda ya da
 * uc'ta degil BURADA durur: uc'a dagilsalar Kesfet listesi ile plan detayi farkli cevaplar verirdi.
 */
public record OpenPlan(Instant meetAt, int capacity, JoinPolicy joinPolicy) {

    public static final int MIN_CAPACITY = 3;
    public static final int MAX_CAPACITY = 8;
    public static final int DEFAULT_CAPACITY = 4;

    /** Host dahil bu kadar onayli koltuk olmadan plan "kesin" sayilmaz (guven kurali). */
    public static final int QUORUM = 3;

    /** Bulusmadan sonra oturumun acik kaldigi sure: "Bulustunuz mu?" bu pencerede sorulur. */
    static final Duration GRACE_AFTER_MEET = Duration.ofHours(3);

    public OpenPlan {
        Objects.requireNonNull(meetAt, "meetAt");
        Objects.requireNonNull(joinPolicy, "joinPolicy");
        if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
            throw new IllegalArgumentException(
                    "capacity must be in [" + MIN_CAPACITY + "," + MAX_CAPACITY + "]");
        }
    }

    /** Yeter sayi KAPASITEDEN bagimsizdir: 3 kisilik bir plan hem kesin hem dolu olabilir. */
    public boolean confirmed(int approvedSeats) {
        return approvedSeats >= QUORUM;
    }

    public boolean full(int approvedSeats) {
        return approvedSeats >= capacity;
    }

    /** Acik planin oturum TTL'i: bulusma + 3 saat. 24 saatlik varsayilan TTL burada gecersiz. */
    public Instant expiresAt() {
        return meetAt.plus(GRACE_AFTER_MEET);
    }

    /** Sinir DAHIL: bulusma aninda "gecti" sayilir, check-in o an sorulabilir. */
    public boolean meetPassed(Instant now) {
        return !now.isBefore(meetAt);
    }
}
