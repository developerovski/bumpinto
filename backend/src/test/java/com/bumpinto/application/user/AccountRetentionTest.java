package com.bumpinto.application.user;

import com.bumpinto.domain.port.RetentionPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AccountRetentionTest {

    private static final Instant NOW = Instant.parse("2026-09-07T03:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

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
        public int deleteSessionsExpiredBefore(Instant cutoff, int batchSize) {
            throw new UnsupportedOperationException("bu test yalniz hesap supurmesini olcer");
        }

        @Override
        public int deleteAccountsPurgeableBefore(Instant now, int batchSize) {
            cutoffs.add(now);
            batchSizes.add(batchSize);
            return results.isEmpty() ? whenScriptEnds : results.poll();
        }
    }

    /**
     * Damga ZATEN +30 gun tasiyor (AccountDeletion.PURGE_DELAY). Burada ikinci kez 30 gun
     * eklenseydi hesaplar 60 gun yasardi ve "30 gunde kalici silinir" sozu tutmazdi.
     */
    @Test
    void theCutoffIsNowBecauseTheDelayAlreadyLivesInTheStamp() {
        ScriptedPort port = new ScriptedPort(0, 0);

        new AccountRetention(port, CLOCK).purgeDeleted();

        assertThat(port.cutoffs).containsExactly(NOW);
    }

    @Test
    void keepsAskingWhileBatchesComeBackFullAndStopsOnTheFirstShortOne() {
        int batch = AccountRetention.BATCH_SIZE;
        ScriptedPort port = new ScriptedPort(0, batch, 3);

        int purged = new AccountRetention(port, CLOCK).purgeDeleted();

        assertThat(purged).isEqualTo(batch + 3);
        assertThat(port.batchSizes).containsExactly(batch, batch);
    }

    @Test
    void nothingToPurgeCostsExactlyOneQuery() {
        ScriptedPort port = new ScriptedPort(0, 0);

        assertThat(new AccountRetention(port, CLOCK).purgeDeleted()).isZero();
        assertThat(port.cutoffs).hasSize(1);
    }

    /** Bozuk bir adapter surekli dolu parti dondurse bile kosu sinirli is yapar. */
    @Test
    void anAdapterThatNeverDrainsCannotSpinForever() {
        ScriptedPort alwaysFull = new ScriptedPort(AccountRetention.BATCH_SIZE);

        int purged = new AccountRetention(alwaysFull, CLOCK).purgeDeleted();

        assertThat(alwaysFull.cutoffs).hasSize(AccountRetention.MAX_BATCHES);
        assertThat(purged).isEqualTo(AccountRetention.MAX_BATCHES * AccountRetention.BATCH_SIZE);
    }
}
