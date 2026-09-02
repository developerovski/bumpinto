package com.bumpinto.adapter.out.provider;

import com.bumpinto.infra.config.AppProps;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProviderQuotaSchedulerTest {

    static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    static final Duration REFRESH = Duration.ofMinutes(5);

    static AppProps props() {
        AppProps base = FoursquareVenueProviderTest.props();
        return new AppProps(base.security(), base.providers(), base.cors(), base.cookies(),
                base.rateLimit(), new AppProps.Quota(REFRESH, 5000));
    }

    static QuotaAwareVenueProvider provider(String id, ProviderQuota measured) {
        QuotaAwareVenueProvider p = mock(QuotaAwareVenueProvider.class);
        when(p.id()).thenReturn(id);
        when(p.measureQuota()).thenReturn(measured);
        return p;
    }

    static ProviderQuota quota(String id, Instant measuredAt, ProviderQuota.Source source) {
        return new ProviderQuota(id, 100, 90, NOW.plus(Duration.ofHours(1)), measuredAt, source);
    }

    @Test
    void measuresEveryProviderAndFillsCache() {
        QuotaAwareVenueProvider fsq = provider("foursquare", quota("foursquare", NOW, ProviderQuota.Source.PROBE));
        QuotaAwareVenueProvider google = provider("google", quota("google", NOW, ProviderQuota.Source.BUDGET));
        ProviderQuotaCache cache = new ProviderQuotaCache();

        new ProviderQuotaScheduler(List.of(fsq, google), cache, CLOCK, props()).refresh();

        assertThat(cache.snapshot()).containsKeys("foursquare", "google");
    }

    /** Cache pencerede zaten tazelendiyse (gercek arama HEADER'i) ucretli prob atilmaz. */
    @Test
    void skipsProbeWhenCacheIsFresh() {
        QuotaAwareVenueProvider fsq = provider("foursquare", quota("foursquare", NOW, ProviderQuota.Source.PROBE));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.record(quota("foursquare", NOW.minus(Duration.ofMinutes(2)), ProviderQuota.Source.HEADER));

        new ProviderQuotaScheduler(List.of(fsq), cache, CLOCK, props()).refresh();

        verify(fsq, never()).measureQuota();
    }

    @Test
    void probesWhenCacheIsStale() {
        QuotaAwareVenueProvider fsq = provider("foursquare", quota("foursquare", NOW, ProviderQuota.Source.PROBE));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.record(quota("foursquare", NOW.minus(Duration.ofMinutes(6)), ProviderQuota.Source.HEADER));

        new ProviderQuotaScheduler(List.of(fsq), cache, CLOCK, props()).refresh();

        verify(fsq, times(1)).measureQuota();
        assertThat(cache.get("foursquare").orElseThrow().source()).isEqualTo(ProviderQuota.Source.PROBE);
    }

    /** 429 ile kapatilmis saglayici, yenilenme ani gelmeden problanmaz — cevabi biliyoruz. */
    @Test
    void doesNotProbeExhaustedProviderBeforeReset() {
        QuotaAwareVenueProvider fsq = provider("foursquare", quota("foursquare", NOW, ProviderQuota.Source.PROBE));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        cache.exhaust("foursquare", NOW.plus(Duration.ofHours(1)), NOW.minus(Duration.ofHours(1)));

        new ProviderQuotaScheduler(List.of(fsq), cache, CLOCK, props()).refresh();
        verify(fsq, never()).measureQuota();

        Clock later = Clock.fixed(NOW.plus(Duration.ofHours(2)), ZoneOffset.UTC);
        new ProviderQuotaScheduler(List.of(fsq), cache, later, props()).refresh();
        verify(fsq, times(1)).measureQuota();
    }

    /** Bir saglayicinin olcumu patlarsa digerleri yine olculur, eski deger cache'te kalir. */
    @Test
    void oneFailureDoesNotStopOthers() {
        QuotaAwareVenueProvider fsq = mock(QuotaAwareVenueProvider.class);
        when(fsq.id()).thenReturn("foursquare");
        when(fsq.measureQuota()).thenThrow(new ProviderException("probe 500"));
        QuotaAwareVenueProvider google = provider("google", quota("google", NOW, ProviderQuota.Source.BUDGET));
        ProviderQuotaCache cache = new ProviderQuotaCache();
        ProviderQuota old = quota("foursquare", NOW.minus(Duration.ofHours(1)), ProviderQuota.Source.HEADER);
        cache.record(old);

        new ProviderQuotaScheduler(List.of(fsq, google), cache, CLOCK, props()).refresh();

        assertThat(cache.get("foursquare")).contains(old);
        assertThat(cache.get("google")).isPresent();
    }
}
