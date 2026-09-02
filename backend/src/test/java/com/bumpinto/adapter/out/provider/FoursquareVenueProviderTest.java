package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FoursquareVenueProviderTest {

    static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    static FoursquareVenueProvider provider(UnirestInstance http) {
        return provider(http, new ProviderQuotaCache());
    }

    static FoursquareVenueProvider provider(UnirestInstance http, ProviderQuotaCache cache) {
        return new FoursquareVenueProvider(http, props(), cache, CLOCK);
    }

    static AppProps props() {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000));
    }

    /**
     * Kategori eslemesi olmayan tur (SWIM ve sonrasi) FSQ'ya HIC gitmez. Gitseydi
     * fsq_category_ids'siz arama olurdu: FSQ filtresiz sonuc doner, kullanici "yuzme"
     * isteyip kafe listesi gorurdu. Mock bir sonuc dondurmeye HAZIR — bos gelmesi
     * cagrinin hic yapilmadiginin kanitidir.
     */
    @Test
    void skipsApiCallForActivityWithoutCategoryMapping() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f9","name":"Filtresiz Kafe",
                          "latitude":51.44,"longitude":5.47}]}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.SWIM, 10);

        assertThat(out).isEmpty();
    }

    @Test
    void parsesSearchResponseAndConvertsRatingToFiveScale() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f1","name":"Café Berlage",
                          "latitude":51.44,"longitude":5.47,
                          "rating":9.2,"price":2,
                          "photos":[{"prefix":"https://p/","suffix":"/x.jpg"}]}]}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        VenueCandidate c = out.get(0);
        assertThat(c.provider()).isEqualTo("foursquare");
        assertThat(c.externalId()).isEqualTo("f1");
        assertThat(c.name()).isEqualTo("Café Berlage");
        assertThat(c.rating()).isEqualTo(4.6);
        assertThat(c.priceLevel()).isEqualTo(2);
        assertThat(c.photoUrl()).isEqualTo("https://p/original/x.jpg");
        assertThat(c.mapsUrl()).isEqualTo("https://maps.google.com/?q=51.44,5.47");
    }

    /**
     * Guncel Places API sozlesmesi: Bearer auth + surum header'i + fsq_category_ids ve
     * limit'in 50'ye clamp'lenmesi. Olu v3 API'sine geri donus bu testi kirar.
     */
    @Test
    void sendsCurrentApiContractAndClampsLimit() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .header("Authorization", "Bearer fsq-key")
                .header("X-Places-Api-Version", "2025-06-17")
                .queryString("fsq_category_ids", "13032") // COFFEE
                .queryString("limit", "50")               // 200 istendi, 50'ye clamp
                .thenReturn("{}");

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 200);

        assertThat(out).isEmpty();
        mock.verifyAll();
    }

    @Test
    void throwsProviderExceptionOnErrorStatus() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn("{}").withStatus(503);

        FoursquareVenueProvider provider = provider(http);

        assertThatThrownBy(() -> provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10))
                .isInstanceOf(ProviderException.class)
                .hasMessageContaining("503")
                .hasMessageNotContaining("fsq-key");
    }

    /** 429 = kredi bitti; Resilient bu tipi gorunce saglayiciyi bir sure devre disi birakir. */
    @Test
    void mapsTooManyRequestsToQuotaExceeded() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("{\"message\":\"Your account has no API credits remaining.\"}")
                .withStatus(429);

        assertThatThrownBy(() -> provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .isInstanceOf(QuotaExceededException.class);
    }

    /** Her gercek yanit x-ratelimit-* tasir; cache'e bedavaya yazilir, prob gerekmez. */
    @Test
    void harvestsQuotaHeadersFromRealSearch() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("{\"results\":[]}")
                .withHeader("x-ratelimit-limit", "180000")
                .withHeader("x-ratelimit-remaining", "179997")
                .withHeader("x-ratelimit-reset", "1788382514");
        ProviderQuotaCache cache = new ProviderQuotaCache();

        provider(http, cache).search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        ProviderQuota q = cache.get(FoursquareVenueProvider.ID).orElseThrow();
        assertThat(q.limit()).isEqualTo(180000);
        assertThat(q.remaining()).isEqualTo(179997);
        assertThat(q.resetAt()).isEqualTo(Instant.ofEpochSecond(1788382514L));
        assertThat(q.source()).isEqualTo(ProviderQuota.Source.HEADER);
    }

    /** Prob: limit=1, tek alan — cevap degil basliklar okunur. */
    @Test
    void probeReadsQuotaFromHeaders() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        // Yalniz en ucuz istek (limit=1, tek alan) eslesir; baska bir sey gonderilirse
        // varsayilan (bos) yanit doner ve basliklar okunamaz — test bu yuzden dusmeli.
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .queryString("limit", "1")
                .queryString("fields", "fsq_place_id")
                .thenReturn("{\"results\":[]}")
                .withHeader("x-ratelimit-limit", "180000")
                .withHeader("x-ratelimit-remaining", "5")
                .withHeader("x-ratelimit-reset", "1788382514");

        ProviderQuota q = provider(http).measureQuota();

        assertThat(q.remaining()).isEqualTo(5);
        assertThat(q.source()).isEqualTo(ProviderQuota.Source.PROBE);
        mock.verifyAll();
    }

    /**
     * Kredi bitti (limit: 0) ≠ saatlik limit. Krediler kendiliginden dolmaz: 24 saat kapali.
     * Saatlik limitte reset basligi ne diyorsa o.
     */
    @Test
    void distinguishesCreditExhaustionFromHourlyRateLimit() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("{\"message\":\"Your account has no API credits remaining.\"}")
                .withStatus(429)
                .withHeader("x-ratelimit-limit", "0")
                .withHeader("x-ratelimit-remaining", "0");

        assertThatThrownBy(() -> provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .isInstanceOfSatisfying(QuotaExceededException.class, e ->
                        assertThat(e.resetAt()).isEqualTo(NOW.plus(FoursquareVenueProvider.CREDIT_COOLDOWN)));

        MockClient.clear(http);
        MockClient rate = MockClient.register(http);
        rate.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("{}")
                .withStatus(429)
                .withHeader("x-ratelimit-limit", "180000")
                .withHeader("x-ratelimit-remaining", "0")
                .withHeader("x-ratelimit-reset", "1788382514");

        assertThatThrownBy(() -> provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .isInstanceOfSatisfying(QuotaExceededException.class, e ->
                        assertThat(e.resetAt()).isEqualTo(Instant.ofEpochSecond(1788382514L)));
    }

    /** Prob 429 gorurse patlamaz: EXHAUSTED olarak doner, scheduler cache'e yazar. */
    @Test
    void probeReportsExhaustedOn429() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn("{}").withStatus(429)
                .withHeader("x-ratelimit-limit", "0");

        ProviderQuota q = provider(http).measureQuota();

        assertThat(q.source()).isEqualTo(ProviderQuota.Source.EXHAUSTED);
        assertThat(q.available(NOW)).isFalse();
    }
}
