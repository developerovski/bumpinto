package com.bumpinto.domain.session;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Acik plan: oturumun Kesfet'te listelenen varyanti. {@code Session.openPlan == null} ise oturum
 * GIZLIDIR (bugunku davet-linkli oturum) — bayrak alani yok, varligin kendisi bayraktir.
 *
 * <p>Kesin bulusma NOKTASI burada DEGIL ({@code anchor}/{@code decidedVenueId} tasir); bu kayit
 * yalniz zaman, kapasite, katilim kurali ve (B-18) pencere + kitledir. Kurallar (sinir, yeter
 * sayi, TTL, bitis) sorguda ya da uc'ta degil BURADA durur: uc'a dagilsalar Kesfet listesi ile plan
 * detayi farkli cevaplar verirdi.
 */
public record OpenPlan(Instant meetAt, int capacity, JoinPolicy joinPolicy,
                       /** "Buradayim" penceresinin sonu; null = noktasal plan (B-17 davranisi). */
                       Instant openUntil,
                       Audience audience) {

    public static final int MIN_CAPACITY = 3;
    public static final int MAX_CAPACITY = 8;
    public static final int DEFAULT_CAPACITY = 4;

    /** Host dahil bu kadar onayli koltuk olmadan plan "kesin" sayilmaz (guven kurali). */
    public static final int QUORUM = 3;

    /** Bulusmadan sonra oturumun acik kaldigi sure: "Bulustunuz mu?" bu pencerede sorulur. */
    static final Duration GRACE_AFTER_MEET = Duration.ofHours(3);

    /** Pencere en cok 3 saat (V23 kisiti ayni sayiyi soyler): "buradayim" TTL'siz suremez. */
    public static final Duration MAX_WINDOW = Duration.ofHours(3);

    public OpenPlan {
        Objects.requireNonNull(meetAt, "meetAt");
        Objects.requireNonNull(joinPolicy, "joinPolicy");
        Objects.requireNonNull(audience, "audience");
        if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
            throw new IllegalArgumentException(
                    "capacity must be in [" + MIN_CAPACITY + "," + MAX_CAPACITY + "]");
        }
        if (openUntil != null
                && (!openUntil.isAfter(meetAt) || openUntil.isAfter(meetAt.plus(MAX_WINDOW)))) {
            throw new IllegalArgumentException("openUntil must be in (meetAt, meetAt + 3h]");
        }
    }

    /** B-17 imzasi: noktasal ve PUBLIC. Eski cagri yerleri kirilmaz. */
    public OpenPlan(Instant meetAt, int capacity, JoinPolicy joinPolicy) {
        this(meetAt, capacity, joinPolicy, null, Audience.PUBLIC);
    }

    /** Planin BITISI: pencereli planda openUntil, noktasalda meetAt. TTL, meetPassed ve check-in buna bakar. */
    public Instant end() {
        return openUntil == null ? meetAt : openUntil;
    }

    /** Yeter sayi KAPASITEDEN bagimsizdir: 3 kisilik bir plan hem kesin hem dolu olabilir. */
    public boolean confirmed(int approvedSeats) {
        return approvedSeats >= QUORUM;
    }

    public boolean full(int approvedSeats) {
        return approvedSeats >= capacity;
    }

    /** Acik planin oturum TTL'i: bitis + 3 saat. 24 saatlik varsayilan TTL burada gecersiz. */
    public Instant expiresAt() {
        return end().plus(GRACE_AFTER_MEET);
    }

    /** Sinir DAHIL: bitis aninda "gecti" sayilir, check-in o an sorulabilir. Noktasal planda bitis = bulusma ani. */
    public boolean meetPassed(Instant now) {
        return !now.isBefore(end());
    }

    /** "Suruyor": yalniz pencereli planda ve [meetAt, openUntil) icinde. */
    public boolean inProgress(Instant now) {
        return openUntil != null && !now.isBefore(meetAt) && now.isBefore(openUntil);
    }

    public boolean listedInDiscover() {
        return audience == Audience.PUBLIC;
    }
}
