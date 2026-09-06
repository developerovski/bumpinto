package com.bumpinto.domain.venue;

/** Saglayicinin sozlesmesi metadata'yi ne kadar tutmamiza izin veriyor (spec §11). */
public enum RetentionRule {
    /** Oturum expires_at'i gecince kazanan disi satirlar indirgenir (FSQ, Google). */
    STRIP_AT_EXPIRY,
    /** Cekimden 24 saat sonra, oturum durumu ne olursa olsun (TripAdvisor). */
    STRIP_AFTER_24H,
    /** Acik veri: dokunulmaz. */
    KEEP
}
