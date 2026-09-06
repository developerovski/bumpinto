package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class ProviderOrchestratorTest {

    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-06T12:00:00Z"), ZoneOffset.UTC);
    static final GeoPoint CENTER = new GeoPoint(51.4416, 5.4697);

    /** Kaydeden sahte kaynak: hangi turlerle kac kez cagrildigini tutar. */
    static final class RecordingSource implements VenueSource {
        private final VenueSourceDescriptor descriptor;
        private final CategoryMapping categories;
        private final Function<SearchRequest, SearchResult> answer;
        final List<List<ActivityType>> calls = new ArrayList<>();
        final List<Double> radii = new ArrayList<>();

        RecordingSource(String id, List<ActivityType> coveredTypes,
                        Function<SearchRequest, SearchResult> answer) {
            this.descriptor = new VenueSourceDescriptor(id, "attribution." + id, null, 10,
                    RetentionRule.STRIP_AT_EXPIRY, false, MapEngine.ANY, ZoneOffset.UTC);
            Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
            coveredTypes.forEach(t -> byType.put(t, List.of(t.name())));
            this.categories = new CategoryMapping(byType);
            this.answer = answer;
        }

        @Override
        public VenueSourceDescriptor descriptor() {
            return descriptor;
        }

        @Override
        public CategoryMapping categories() {
            return categories;
        }

        @Override
        public SearchResult search(SearchRequest request) {
            calls.add(request.types());
            radii.add(request.radiusKm());
            return answer.apply(request);
        }
    }

    static VenueCandidate candidate(String source, String id, ActivityType type) {
        return new VenueCandidate(source, id, id, null, null, null, null,
                null, null, null, null, null, null, type, null, null, null);
    }

    static ProviderOrchestrator orchestrator(List<VenueSource> sources, AppProps props, BudgetGate gate) {
        return new ProviderOrchestrator(sources, props, new ProviderQuotaCache(), gate, CLOCK);
    }

    static BudgetGate openGate() {
        return new BudgetGate(new BudgetGateTest.FakeUsage(), TestProps.defaults(), CLOCK);
    }

    @Test
    void splitsTypesByRouteMergesSharedRoutesAndDeduplicatesPerSource() {
        RecordingSource fsq = new RecordingSource("foursquare",
                List.of(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.BAR, ActivityType.NIGHTLIFE),
                req -> new SearchResult(List.of(
                        candidate("foursquare", "f1", ActivityType.COFFEE),
                        candidate("foursquare", "f1", ActivityType.COFFEE)), null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.values()),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.SWIM)), null));

        ProviderOrchestrator orch = orchestrator(List.of(fsq, open), TestProps.defaults(), openGate());
        List<VenueCandidate> result = orch.search(CENTER, 3.1,
                List.of(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.SWIM), 10);

        assertThat(fsq.calls).containsExactly(List.of(ActivityType.COFFEE, ActivityType.FOOD));
        assertThat(open.calls).containsExactly(List.of(ActivityType.SWIM));
        assertThat(result).extracting(VenueCandidate::externalId).containsExactly("f1", "o1");
        // 3,1 km kovaya yuvarlanir: kaynaga 5,0 km olarak ulasir.
        assertThat(fsq.radii).containsExactly(5.0);
        assertThat(open.radii).containsExactly(5.0);
    }

    @Test
    void firstSourceWinsAndEmptyFallsThrough() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("foursquare", "f1", ActivityType.COFFEE)), null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));
        ProviderOrchestrator orch = orchestrator(List.of(fsq, open), TestProps.defaults(), openGate());

        List<VenueCandidate> result = orch.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);

        assertThat(result).extracting(VenueCandidate::externalId).containsExactly("f1");
        assertThat(open.calls).isEmpty();

        RecordingSource fsqEmpty = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> SearchResult.empty());
        RecordingSource open2 = new RecordingSource("open", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));
        ProviderOrchestrator orch2 = orchestrator(List.of(fsqEmpty, open2), TestProps.defaults(), openGate());

        List<VenueCandidate> result2 = orch2.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);

        assertThat(result2).extracting(VenueCandidate::externalId).containsExactly("o1");
    }

    @Test
    void skipsSourceWhoseMonthlyBudgetIsSpent() {
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "fsq-key", 1));
        AppProps props = TestProps.of(new AppProps.Venues(sources, TestProps.venues().route()));

        BudgetGateTest.FakeUsage usage = new BudgetGateTest.FakeUsage();
        usage.increment("foursquare", YearMonth.of(2026, 9));
        BudgetGate gate = new BudgetGate(usage, props, CLOCK);

        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("foursquare", "f1", ActivityType.COFFEE)), null));
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));

        ProviderOrchestrator orch = orchestrator(List.of(fsq, open), props, gate);
        List<VenueCandidate> result = orch.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);

        assertThat(fsq.calls).isEmpty();
        assertThat(result).extracting(VenueCandidate::externalId).containsExactly("o1");
    }

    @Test
    void marksSourceExhaustedAfterQuotaExceeded() {
        Instant resetAt = CLOCK.instant().plus(Duration.ofHours(24));
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> {
                    throw new QuotaExceededException("credits", resetAt);
                });
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));

        ProviderOrchestrator orch = orchestrator(List.of(fsq, open), TestProps.defaults(), openGate());
        orch.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);
        orch.search(CENTER, 40, List.of(ActivityType.COFFEE), 10);

        assertThat(fsq.calls).hasSize(1);
    }

    @Test
    void cachesFullResultsAndRemembersEmptyOnes() {
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.SWIM),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.SWIM)), null));
        ProviderOrchestrator orch = orchestrator(List.of(open), TestProps.defaults(), openGate());

        List<VenueCandidate> r1 = orch.search(CENTER, 5, List.of(ActivityType.SWIM), 10);
        List<VenueCandidate> r2 = orch.search(CENTER, 5, List.of(ActivityType.SWIM), 10);

        assertThat(open.calls).hasSize(1);
        assertThat(r1).extracting(VenueCandidate::externalId).containsExactly("o1");
        assertThat(r2).isEqualTo(r1);

        RecordingSource openEmpty = new RecordingSource("open", List.of(ActivityType.SWIM),
                req -> SearchResult.empty());
        ProviderOrchestrator orch2 = orchestrator(List.of(openEmpty), TestProps.defaults(), openGate());

        List<VenueCandidate> e1 = orch2.search(CENTER, 5, List.of(ActivityType.SWIM), 10);
        List<VenueCandidate> e2 = orch2.search(CENTER, 5, List.of(ActivityType.SWIM), 10);

        assertThat(openEmpty.calls).hasSize(1);
        assertThat(e1).isEmpty();
        assertThat(e2).isEmpty();
    }

    @Test
    void degradedResultIsNotCachedButRecoveredGroupIs() {
        RecordingSource fsq = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> {
                    throw new RuntimeException("timeout");
                });
        RecordingSource open = new RecordingSource("open", List.of(ActivityType.COFFEE),
                req -> new SearchResult(List.of(candidate("open", "o1", ActivityType.COFFEE)), null));
        ProviderOrchestrator orch = orchestrator(List.of(fsq, open), TestProps.defaults(), openGate());

        List<VenueCandidate> r1 = orch.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);
        List<VenueCandidate> r2 = orch.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);

        assertThat(r1).extracting(VenueCandidate::externalId).containsExactly("o1");
        assertThat(r2).extracting(VenueCandidate::externalId).containsExactly("o1");
        // Toparlanmis sonuc onbelleklendi: open sadece bir kez cagrildi.
        assertThat(open.calls).hasSize(1);

        RecordingSource onlyFailing = new RecordingSource("foursquare", List.of(ActivityType.COFFEE),
                req -> {
                    throw new RuntimeException("timeout");
                });
        ProviderOrchestrator orch2 = orchestrator(List.of(onlyFailing), TestProps.defaults(), openGate());

        orch2.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);
        orch2.search(CENTER, 5, List.of(ActivityType.COFFEE), 10);

        // Tamamen bozuk sonuc onbelleklenmez ve BOS isareti de birakmaz: her seferinde tekrar denenir.
        assertThat(onlyFailing.calls).hasSize(2);
    }

    @Test
    void cacheKeyRoundsCenterBucketsRadiusAndSortsTypes() {
        String a = ProviderOrchestrator.cacheKey(CENTER, 3.0,
                List.of(ActivityType.FOOD, ActivityType.COFFEE));
        String b = ProviderOrchestrator.cacheKey(new GeoPoint(51.4444, 5.4666), 4.9,
                List.of(ActivityType.COFFEE, ActivityType.FOOD));
        String c = ProviderOrchestrator.cacheKey(CENTER, 12.0, List.of(ActivityType.COFFEE));

        assertThat(a).isEqualTo(b);
        assertThat(a).isNotEqualTo(c);
    }
}
