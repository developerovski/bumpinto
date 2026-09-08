package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.VenueRetentionPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Component
public class VenueRetentionAdapter implements VenueRetentionPort {

    private final VenueRetentionRepository rows;

    public VenueRetentionAdapter(VenueRetentionRepository rows) {
        this.rows = rows;
    }

    @Override @Transactional
    public int stripExpiredSessions(Set<String> providers, Instant now) {
        return rows.stripExpired(providers, now);
    }

    @Override @Transactional
    public int stripWinnerPhotos(Set<String> providers, Instant now) {
        return rows.stripWinnerPhoto(providers, now);
    }

    @Override @Transactional
    public int stripOlderThan(Set<String> providers, Instant cutoff) {
        return rows.stripAged(providers, cutoff);
    }
}
