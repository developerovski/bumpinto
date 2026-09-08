package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.RetentionPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class RetentionAdapter implements RetentionPort {

    private final SessionRetentionRepository sessions;
    private final AccountRetentionRepository accounts;

    RetentionAdapter(SessionRetentionRepository sessions, AccountRetentionRepository accounts) {
        this.sessions = sessions;
        this.accounts = accounts;
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

    @Override
    @Transactional
    public int deleteAccountsPurgeableBefore(Instant now, int batchSize) {
        return accounts.deletePurgeableBatch(now, batchSize);
    }
}
