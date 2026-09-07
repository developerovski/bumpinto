package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.SessionRetentionPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class SessionRetentionAdapter implements SessionRetentionPort {

    private final SessionRetentionRepository sessions;

    SessionRetentionAdapter(SessionRetentionRepository sessions) {
        this.sessions = sessions;
    }

    /**
     * Parti KENDI transaction'inda kapanir: satir kilitleri hemen birakilir, birikmis backlog
     * sessions tablosunu tek uzun transaction boyunca tutmaz.
     */
    @Override
    @Transactional
    public int deleteSessionsExpiredBefore(Instant cutoff, int batchSize) {
        return sessions.deleteExpiredBatch(cutoff, batchSize);
    }
}
