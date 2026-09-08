package com.bumpinto.application.session;

import com.bumpinto.domain.port.RetentionPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SessionRetentionTest {

    private static final Instant NOW = Instant.parse("2026-09-07T03:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    /** Onceden yazilmis parti boyutlarini sirayla donen sahte port; cagrilari kaydeder. */
    static final class ScriptedPort implements RetentionPort {
        final List<Instant> cutoffs = new ArrayList<>();
        final List<Integer> batchSizes = new ArrayList<>();
        private final Deque<Integer> results = new ArrayDeque<>();
        private final int whenScriptEnds;

        ScriptedPort(int whenScriptEnds, Integer... scripted) {
            this.whenScriptEnds = whenScriptEnds;
            this.results.addAll(List.of(scripted));
        }

        @Override
        public int deleteAccountsPurgeableBefore(Instant now, int batchSize) {
            throw new UnsupportedOperationException("bu test yalniz oturum supurmesini olcer");
        }

        @Override
        public int deleteSessionsExpiredBefore(Instant cutoff, int batchSize) {
            cutoffs.add(cutoff);
            batchSizes.add(batchSize);
            return results.isEmpty() ? whenScriptEnds : results.poll();
        }
    }

    @Test
    void cutoffIsExactlyThirtyDaysBeforeNowAndTheBoundaryIsStrict() {
        ScriptedPort port = new ScriptedPort(0, 0);

        new SessionRetention(port, CLOCK).purgeExpired();

        // Tam 30 gun once suresi dolan oturum ELENMEZ: adapter kosulu "expires_at < cutoff".
        assertThat(port.cutoffs).containsExactly(NOW.minus(Duration.ofDays(30)));
    }

    @Test
    void keepsAskingWhileBatchesComeBackFullAndStopsOnTheFirstShortOne() {
        int batch = SessionRetention.BATCH_SIZE;
        ScriptedPort port = new ScriptedPort(0, batch, batch, 7);

        int purged = new SessionRetention(port, CLOCK).purgeExpired();

        assertThat(purged).isEqualTo(2 * batch + 7);
        assertThat(port.batchSizes).containsExactly(batch, batch, batch);
    }

    @Test
    void emptyDatabaseCostsExactlyOneQuery() {
        ScriptedPort port = new ScriptedPort(0, 0);

        int purged = new SessionRetention(port, CLOCK).purgeExpired();

        assertThat(purged).isZero();
        assertThat(port.cutoffs).hasSize(1);
    }

    /** Bozuk bir adapter surekli dolu parti dondurse bile kosu sinirli is yapar. */
    @Test
    void anAdapterThatNeverDrainsCannotSpinForever() {
        ScriptedPort alwaysFull = new ScriptedPort(SessionRetention.BATCH_SIZE);

        int purged = new SessionRetention(alwaysFull, CLOCK).purgeExpired();

        assertThat(alwaysFull.cutoffs).hasSize(SessionRetention.MAX_BATCHES);
        assertThat(purged).isEqualTo(SessionRetention.MAX_BATCHES * SessionRetention.BATCH_SIZE);
    }
}
