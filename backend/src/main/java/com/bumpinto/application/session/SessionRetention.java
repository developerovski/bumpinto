package com.bumpinto.application.session;

import com.bumpinto.domain.port.SessionRetentionPort;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Spec §6: suresi dolali 30 gunu gecen oturumlar kalici silinir. Katilimci verisi (ad +
 * koordinat) sema cascade'i ile gider (SessionCascadeDeleteTest); {@code users} BILINCLI olarak
 * korunur — hesap yasam dongusu oturum yasam dongusunden ayridir.
 */
@Service
public class SessionRetention {

    static final Duration RETENTION = Duration.ofDays(30);

    /** Birikmis backlog tek transaction'da silinirse sessions uzun sure kilitlenir. */
    static final int BATCH_SIZE = 500;

    /** Bozuk bir adapter surekli dolu parti dondurse bile kosu sinirli is yapar. */
    static final int MAX_BATCHES = 1000;

    private final SessionRetentionPort port;
    private final Clock clock;

    public SessionRetention(SessionRetentionPort port, Clock clock) {
        this.port = port;
        this.clock = clock;
    }

    /** @return silinen oturum sayisi */
    public int purgeExpired() {
        Instant cutoff = clock.instant().minus(RETENTION);
        int total = 0;
        for (int batch = 0; batch < MAX_BATCHES; batch++) {
            int deleted = port.deleteSessionsExpiredBefore(cutoff, BATCH_SIZE);
            total += deleted;
            if (deleted < BATCH_SIZE) {
                return total;
            }
        }
        return total;
    }
}
