package com.bumpinto.application.user;

import java.time.Instant;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Haftalik "bulustuk" serisi (B-18 rozetleri). ISO haftasi: Pazartesi baslangic, UTC. Bu hafta YA
 * DA gecen hafta bulusma varsa seri yasar (hafta ortasinda "seri bitti" gorulmez), oradan geriye
 * kesintisiz haftalar sayilir. Saf fonksiyon; saat dilimi bilerek UTC — profil dili/dilimi seriyi
 * bir gun kaydirsa bile rozet esikleri (3 hafta) bundan etkilenmez.
 */
final class MetStreak {

    private MetStreak() {
    }

    static int weeks(Collection<Instant> metAt, Instant now) {
        Set<Long> weeks = metAt.stream().map(MetStreak::weekIndex).collect(Collectors.toSet());
        long cursor = weekIndex(now);
        if (!weeks.contains(cursor)) {
            cursor--;
            if (!weeks.contains(cursor)) {
                return 0;
            }
        }
        int n = 0;
        while (weeks.contains(cursor)) {
            n++;
            cursor--;
        }
        return n;
    }

    /** Epoch'tan beri hafta indeksi; 1970-01-01 Persembe oldugu icin +3 gun kaydirilir, boylece sinir Pazartesi 00:00 UTC. */
    static long weekIndex(Instant t) {
        return Math.floorDiv(Math.floorDiv(t.getEpochSecond(), 86_400L) + 3, 7L);
    }
}
