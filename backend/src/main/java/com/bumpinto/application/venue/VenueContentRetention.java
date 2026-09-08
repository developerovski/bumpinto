package com.bumpinto.application.venue;

import com.bumpinto.domain.port.VenueRetentionPort;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Saglayici sozlesmelerinin metadata omru (spec §11). DB-ICI; ucretli cagri yok. */
@Service
@ConditionalOnProperty(prefix = "bumpinto.retention", name = "enabled", matchIfMissing = true)
public class VenueContentRetention {

    private static final Logger log = LoggerFactory.getLogger(VenueContentRetention.class);
    private static final Duration MAX_AGE = Duration.ofHours(24);

    private final Set<String> atExpiry;
    private final Set<String> after24h;
    private final VenueRetentionPort rows;
    private final Clock clock;

    public VenueContentRetention(List<VenueSource> sources, VenueRetentionPort rows, Clock clock) {
        this.atExpiry = idsWith(sources, RetentionRule.STRIP_AT_EXPIRY);
        this.after24h = idsWith(sources, RetentionRule.STRIP_AFTER_24H);
        this.rows = rows;
        this.clock = clock;
    }

    private static Set<String> idsWith(List<VenueSource> sources, RetentionRule rule) {
        return sources.stream().map(VenueSource::descriptor)
                .filter(d -> d.retention() == rule)
                .map(VenueSourceDescriptor::id)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** Saatte bir; oturum TTL'i 24 saat oldugu icin daha sik kosmanin kazanci yok. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M", scheduler = "retentionScheduler")
    public void run() {
        Instant now = clock.instant();
        if (!atExpiry.isEmpty()) {
            int stripped = rows.stripExpiredSessions(atExpiry, now);
            int winners = rows.stripWinnerPhotos(atExpiry, now);
            log.info("retention: stripped {} expired rows, {} winner photos ({})", stripped, winners, atExpiry);
        }
        if (!after24h.isEmpty()) {
            int aged = rows.stripOlderThan(after24h, now.minus(MAX_AGE));
            log.info("retention: stripped {} rows older than 24h ({})", aged, after24h);
        }
    }
}
