package com.bumpinto.application.venue;

import com.bumpinto.domain.port.VenueRetentionPort;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class VenueContentRetentionTest {

    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-06T12:00:00Z"), ZoneOffset.UTC);

    /** Kaydeden sahte port: hangi kural, hangi kaynak kumesi ve hangi anla cagrildi. */
    static final class RecordingPort implements VenueRetentionPort {
        final List<String> calls = new ArrayList<>();

        @Override
        public int stripExpiredSessions(Set<String> providers, Instant now) {
            calls.add("expired" + providers + now);
            return 0;
        }

        @Override
        public int stripWinnerPhotos(Set<String> providers, Instant now) {
            calls.add("winner" + providers + now);
            return 0;
        }

        @Override
        public int stripOlderThan(Set<String> providers, Instant cutoff) {
            calls.add("aged" + providers + cutoff);
            return 0;
        }
    }

    static VenueSource source(String id, RetentionRule rule) {
        VenueSourceDescriptor descriptor = new VenueSourceDescriptor(id, "attribution." + id, null,
                null, rule, false, MapEngine.ANY, ZoneOffset.UTC);
        return new VenueSource() {
            @Override public VenueSourceDescriptor descriptor() {
                return descriptor;
            }

            @Override public CategoryMapping categories() {
                throw new UnsupportedOperationException("bu testte cagrilmaz");
            }

            @Override public SearchResult search(SearchRequest request) {
                throw new UnsupportedOperationException("bu testte cagrilmaz");
            }
        };
    }

    @Test
    void appliesEachRuleToTheSourcesThatDeclareIt() {
        VenueSource foursquare = source("foursquare", RetentionRule.STRIP_AT_EXPIRY);
        VenueSource google = source("google", RetentionRule.STRIP_AT_EXPIRY);
        VenueSource tripadvisor = source("tripadvisor", RetentionRule.STRIP_AFTER_24H);
        VenueSource open = source("open", RetentionRule.KEEP);
        RecordingPort port = new RecordingPort();
        VenueContentRetention retention = new VenueContentRetention(
                List.of(foursquare, google, tripadvisor, open), port, CLOCK);

        retention.run();

        Instant now = CLOCK.instant();
        assertThat(port.calls).containsExactly(
                "expired[foursquare, google]" + now,
                "winner[foursquare, google]" + now,
                "aged[tripadvisor]" + now.minus(Duration.ofHours(24)));
    }

    @Test
    void doesNothingWhenEverySourceKeepsItsData() {
        VenueSource open = source("open", RetentionRule.KEEP);
        RecordingPort port = new RecordingPort();
        VenueContentRetention retention = new VenueContentRetention(List.of(open), port, CLOCK);

        retention.run();

        assertThat(port.calls).isEmpty();
    }
}
