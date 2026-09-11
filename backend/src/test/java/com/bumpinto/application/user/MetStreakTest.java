package com.bumpinto.application.user;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Haftalik seri: ISO haftasi (Pazartesi baslangic, UTC). Bu hafta YA DA gecen hafta bulusma
 * varsa seri sayilir — Cumartesi bulusan biri Pazartesi "seri bitti" gormesin.
 */
class MetStreakTest {

    // 2026-09-09 Carsamba (ISO haftasi Pzt 2026-09-07 ile baslar).
    static final Instant NOW = Instant.parse("2026-09-09T10:00:00Z");
    static final Duration WEEK = Duration.ofDays(7);

    @Test
    void noCheckinsIsZero() {
        assertThat(MetStreak.weeks(List.of(), NOW)).isZero();
    }

    @Test
    void thisWeekAloneIsOne() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(Duration.ofDays(1))), NOW)).isEqualTo(1);
    }

    /** Gecen hafta bulustu, bu hafta henuz degil: seri hala 1 (hafta ortasi kirilmaz). */
    @Test
    void lastWeekStillCountsWhenThisWeekIsEmpty() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(WEEK)), NOW)).isEqualTo(1);
    }

    @Test
    void consecutiveWeeksAddUpAndAGapBreaksTheStreak() {
        List<Instant> met = List.of(NOW, NOW.minus(WEEK), NOW.minus(WEEK.multipliedBy(2)),
                NOW.minus(WEEK.multipliedBy(4))); // 3. hafta bos -> 4. sayilmaz
        assertThat(MetStreak.weeks(met, NOW)).isEqualTo(3);
    }

    /** Iki hafta once son bulusma: seri bitti. */
    @Test
    void twoWeeksAgoIsBroken() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(WEEK.multipliedBy(2))), NOW)).isZero();
    }

    /** Hafta siniri Pazartesi 00:00 UTC: Pazar gecesi ile Pazartesi sabahi farkli haftadir. */
    @Test
    void weekBoundaryIsMondayUtc() {
        Instant sundayNight = Instant.parse("2026-09-06T23:59:59Z");
        Instant mondayMorning = Instant.parse("2026-09-07T00:00:00Z");
        assertThat(MetStreak.weekIndex(sundayNight) + 1).isEqualTo(MetStreak.weekIndex(mondayMorning));
    }
}
