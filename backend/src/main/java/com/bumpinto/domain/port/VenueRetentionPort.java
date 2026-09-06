package com.bumpinto.domain.port;

import java.time.Instant;
import java.util.Set;

/** Saklama indirgemesi (spec §11). Uc kural, uc yazma; hepsi DB-ICI, ucretli cagri YOK. */
public interface VenueRetentionPort {

    /** Suresi dolmus oturumlarda KAZANAN DISI satirlari indirger. */
    int stripExpiredSessions(Set<String> providers, Instant now);

    /** Suresi dolmus oturumlarin KAZANAN satirinda yalniz foto ve puan alanlarini dusurur; ad/koordinat/link kalir. */
    int stripWinnerPhotos(Set<String> providers, Instant now);

    /** fetched_at'i cutoff'tan eski satirlari indirger (oturum durumundan bagimsiz). */
    int stripOlderThan(Set<String> providers, Instant cutoff);
}
