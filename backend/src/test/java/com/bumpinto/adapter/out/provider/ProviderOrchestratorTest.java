package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProviderOrchestratorTest {

    static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    static final GeoPoint CENTER = new GeoPoint(51.5, 5.5);
    static final VenueCandidate FSQ_CAND = new VenueCandidate("foursquare", "f1", "FSQ Mekan",
            CENTER, 4.6, 2, "https://fsq/f1.jpg", "https://maps/f1");
    static final VenueCandidate G_CAND = new VenueCandidate("google", "g1", "Google Mekan",
            CENTER, 4.2, 1, null, "https://maps/g1");

    static QuotaAwareVenueProvider provider(String id, List<VenueCandidate> result) {
        QuotaAwareVenueProvider p = mock(QuotaAwareVenueProvider.class);
        when(p.id()).thenReturn(id);
        when(p.search(any(), anyDouble(), any(), anyInt())).thenReturn(result);
        return p;
    }

    static ProviderQuota quota(String id, long limit, long remaining) {
        return new ProviderQuota(id, limit, remaining, NOW.plus(Duration.ofHours(1)), NOW,
                ProviderQuota.Source.HEADER);
    }

    static List<VenueCandidate> search(ProviderOrchestrator o) {
        return o.search(CENTER, 5.0, List.of(ActivityType.COFFEE), 10);
    }

    /** Kota oranı yüksek olan kazanır — @Order sırası değil. */
    @Test
    void picksProviderWithHighestRemainingRatio() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.record(quota("foursquare", 1000, 50));   // %5
        cache.record(quota("google", 5000, 4000));     // %80

        assertThat(search(new ProviderOrchestrator(List.of(fsq, google), cache, CLOCK)))
                .containsExactly(G_CAND);
        verify(fsq, never()).search(any(), anyDouble(), any(), anyInt());
    }

    /** Kota bilinmiyorsa (cache boş — yeni pod) @Order sırası geçerli, seçim kararsız değil. */
    @Test
    void fallsBackToOrderWhenQuotaUnknown() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));

        assertThat(search(new ProviderOrchestrator(List.of(fsq, google), new ProviderQuotaCache(), CLOCK)))
                .containsExactly(FSQ_CAND);
    }

    /** Kotası bilinen, bilinmeyenden önce gelir: bilinen 0 oran bile "hiç bilgi yok"tan iyidir. */
    @Test
    void knownQuotaOutranksUnknown() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.record(quota("google", 5000, 1));

        assertThat(search(new ProviderOrchestrator(List.of(fsq, google), cache, CLOCK)))
                .containsExactly(G_CAND);
    }

    /** EXHAUSTED sağlayıcı hiç denenmez; yenilenme anı geçince yeniden aday olur. */
    @Test
    void skipsExhaustedUntilReset() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.exhaust("foursquare", NOW.plus(Duration.ofHours(1)), NOW);
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq, google), cache, CLOCK);

        assertThat(search(o)).containsExactly(G_CAND);
        verify(fsq, never()).search(any(), anyDouble(), any(), anyInt());

        Clock later = Clock.fixed(NOW.plus(Duration.ofHours(2)), ZoneOffset.UTC);
        ProviderOrchestrator afterReset = new ProviderOrchestrator(List.of(fsq, google), cache, later);
        assertThat(afterReset.search(new GeoPoint(52.0, 4.0), 5.0, List.of(ActivityType.BAR), 10))
                .containsExactly(FSQ_CAND);
    }

    /** 429 → cache'e EXHAUSTED yazılır ve aynı çağrıda sıradakine düşülür. */
    @Test
    void quotaExceededMarksCacheAndFallsThrough() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of());
        when(fsq.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new QuotaExceededException("credits", NOW.plus(Duration.ofHours(24))));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq, google), cache, CLOCK);

        assertThat(search(o)).containsExactly(G_CAND);
        ProviderQuota q = cache.get("foursquare").orElseThrow();
        assertThat(q.source()).isEqualTo(ProviderQuota.Source.EXHAUSTED);
        assertThat(q.resetAt()).isEqualTo(NOW.plus(Duration.ofHours(24)));

        o.search(new GeoPoint(52.0, 4.0), 5.0, List.of(ActivityType.BAR), 10);
        verify(fsq, times(1)).search(any(), anyDouble(), any(), anyInt());
    }

    /** Geçici hata (5xx) kota durumunu değiştirmez: bir sonraki aramada yine denenir. */
    @Test
    void transientFailureDoesNotTouchQuota() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of());
        when(fsq.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new ProviderException("503"))
                .thenReturn(List.of(FSQ_CAND));
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq, google), cache, CLOCK);

        assertThat(search(o)).containsExactly(G_CAND);
        assertThat(cache.get("foursquare")).isEmpty();
        assertThat(o.search(new GeoPoint(52.0, 4.0), 5.0, List.of(ActivityType.BAR), 10))
                .containsExactly(FSQ_CAND);
    }

    @Test
    void emptyResultFallsThrough() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of());
        QuotaAwareVenueProvider google = provider("google", List.of(G_CAND));

        assertThat(search(new ProviderOrchestrator(List.of(fsq, google), new ProviderQuotaCache(), CLOCK)))
                .containsExactly(G_CAND);
    }

    /** Hepsi hata verirse "mekan yok" denmez — istisna yukarı gider. */
    @Test
    void propagatesWhenEveryProviderFails() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of());
        when(fsq.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new QuotaExceededException("credits", NOW.plus(Duration.ofHours(1))));
        QuotaAwareVenueProvider google = provider("google", List.of());
        when(google.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new ProviderException("google 500"));

        assertThatThrownBy(() -> search(new ProviderOrchestrator(List.of(fsq, google), new ProviderQuotaCache(), CLOCK)))
                .isInstanceOf(ProviderException.class)
                .hasMessageContaining("google 500");
    }

    @Test
    void cachesResultsButNotEmptyOnes() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq), new ProviderQuotaCache(), CLOCK);
        search(o);
        search(o);
        verify(fsq, times(1)).search(any(), anyDouble(), any(), anyInt());

        QuotaAwareVenueProvider empty = provider("google", List.of());
        ProviderOrchestrator e = new ProviderOrchestrator(List.of(empty), new ProviderQuotaCache(), CLOCK);
        assertThat(search(e)).isEmpty();
        assertThat(search(e)).isEmpty();
        verify(empty, times(2)).search(any(), anyDouble(), any(), anyInt());
    }

    /** Cache anahtari SIRAYA duyarli OLMAMALI: {COFFEE,BAR} ile {BAR,COFFEE} ayni aramadir. */
    @Test
    void cacheKeyIsOrderIndependentForTheSameActivitySet() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq), new ProviderQuotaCache(),
                CLOCK);

        o.search(CENTER, 5.0, List.of(ActivityType.COFFEE, ActivityType.BAR), 20);
        o.search(CENTER, 5.0, List.of(ActivityType.BAR, ActivityType.COFFEE), 20);

        verify(fsq, times(1)).search(any(), anyDouble(), any(), anyInt());
    }

    /** Farkli kume = farkli anahtar: kahve destesi hike destesini kirletmez. */
    @Test
    void differentActivitySetsDoNotShareACacheEntry() {
        QuotaAwareVenueProvider fsq = provider("foursquare", List.of(FSQ_CAND));
        ProviderOrchestrator o = new ProviderOrchestrator(List.of(fsq), new ProviderQuotaCache(),
                CLOCK);

        o.search(CENTER, 5.0, List.of(ActivityType.COFFEE), 20);
        o.search(CENTER, 5.0, List.of(ActivityType.COFFEE, ActivityType.HIKE), 20);

        verify(fsq, times(2)).search(any(), anyDouble(), any(), anyInt());
    }
}
