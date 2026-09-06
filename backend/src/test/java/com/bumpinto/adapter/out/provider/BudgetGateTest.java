package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetGateTest {

    /** Sabit saat: Pasifik'te hala Agustos, UTC'de zaten Eylul (billingZone testi buradan gelir). */
    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-01T03:00:00Z"), ZoneOffset.UTC);

    static class FakeUsage implements ProviderUsagePort {
        final Map<String, Long> counts = new HashMap<>();

        @Override
        public long increment(String provider, YearMonth month) {
            return counts.merge(provider + "@" + month, 1L, Long::sum);
        }

        @Override
        public long current(String provider, YearMonth month) {
            return counts.getOrDefault(provider + "@" + month, 0L);
        }
    }

    static VenueSourceDescriptor descriptor(String id, ZoneId zone) {
        return new VenueSourceDescriptor(id, "attribution." + id, null, 10,
                RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.ANY, zone);
    }

    @Test
    void allowsUntilTheBudgetIsSpentThenRefusesAndZeroMeansUnlimited() {
        Map<String, AppProps.VenueSourceProps> sourcesWithFsqBudget2 =
                new LinkedHashMap<>(TestProps.venues().sources());
        sourcesWithFsqBudget2.put("foursquare", new AppProps.VenueSourceProps(true, "fsq-key", 2));
        AppProps props = TestProps.of(new AppProps.Venues(sourcesWithFsqBudget2, TestProps.venues().route()));

        FakeUsage usage = new FakeUsage();
        BudgetGate gate = new BudgetGate(usage, props, CLOCK);

        VenueSourceDescriptor foursquare = descriptor("foursquare", ZoneOffset.UTC);
        assertThat(gate.allows(foursquare)).isTrue();
        gate.record(foursquare);
        assertThat(gate.allows(foursquare)).isTrue();
        gate.record(foursquare);
        assertThat(gate.allows(foursquare)).isFalse();

        VenueSourceDescriptor open = descriptor("open", ZoneOffset.UTC);
        assertThat(gate.allows(open)).isTrue();
        gate.record(open);
        assertThat(usage.counts).doesNotContainKey("open@2026-09");
    }

    @Test
    void monthBoundaryFollowsTheBillingZone() {
        FakeUsage usage = new FakeUsage();
        BudgetGate gate = new BudgetGate(usage, TestProps.defaults(), CLOCK);

        gate.record(descriptor("foursquare", ZoneOffset.UTC));
        gate.record(descriptor("google", ZoneId.of("America/Los_Angeles")));

        assertThat(usage.counts).containsOnlyKeys("foursquare@2026-09", "google@2026-08");
    }
}
