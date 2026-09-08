package com.bumpinto.adapter.out.presence;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryNudgeCooldownTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    /** Pencere zaman ISTER; Clock.fixed ile ölçülemez, Thread.sleep ile ölçülmemeli. */
    static final class TickingClock extends Clock {
        Instant now = T0;

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override public Instant instant() {
            return now;
        }
    }

    @Test
    void theWindowIsPerPairAndReopensAfterIt() {
        TickingClock clock = new TickingClock();
        InMemoryNudgeCooldown cooldown = new InMemoryNudgeCooldown(clock);
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID c = UUID.randomUUID();

        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isTrue();
        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isFalse();
        // Kota HEDEFE degil CIFTE bagli: c'nin b'yi durtme hakki a tarafindan yenmez.
        assertThat(cooldown.tryNudge(c, b, Duration.ofSeconds(60))).isTrue();
        clock.advance(Duration.ofSeconds(61));
        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isTrue();
    }

    /** Ters yon AYRI kotadir: b'nin a'ya cevap zili, a'nin az onceki zili yuzunden susturulmaz. */
    @Test
    void theWindowIsDirectional() {
        InMemoryNudgeCooldown cooldown = new InMemoryNudgeCooldown(new TickingClock());
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();

        assertThat(cooldown.tryNudge(a, b, Duration.ofSeconds(60))).isTrue();
        assertThat(cooldown.tryNudge(b, a, Duration.ofSeconds(60))).isTrue();
    }
}
