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
                new AppProps.Quota(Duration.ofMinutes(5), 1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
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
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.SWIM), 10);

        assertThat(out).isEmpty();
    }

    /**
     * KISMI kapsama = kapsama yok. FSQ hike'i eslemiyor; kahve+hike icin dolu bir kahve
     * listesi donerse orkestrator "ilk dolu kazanir" der ve Google'a hic gitmez -- kullanici
     * sectigi hike'tan tek mekan gormez. Bos donup Google'a birakmak TEK dogru davranis.
     */
    @Test
    void returnsEmptyWhenItCannotCoverEverySelectedActivity() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient.register(http);

        List<VenueCandidate> result = provider(http).search(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE, ActivityType.HIKE), 20);

        assertThat(result).isEmpty();
    }

    /** Hepsi esleniyorsa kategoriler virgulle birlesir: yine TEK istek. */
    @Test
    void joinsCategoryIdsWhenEveryActivityIsMapped() {
        assertThat(FoursquareVenueProvider.categoryIds(
                List.of(ActivityType.COFFEE, ActivityType.BAR))).isEqualTo("13032,13003");
    }

    @Test
    void requestsOnlyProFieldsAndMapsCategoryAndLocality() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        // Unirest 4.10'un Assert arayuzunde queryParam dogrulayan bir metot yok (yalniz
        // hadHeader/hadBody/hadField/wasInvokedTimes) — eslesme mock.expect(...).queryString(...)
        // ile KURULUR, sonda verifyAll() ile dogrulanir.
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .queryString("fields",
                        "fsq_place_id,name,latitude,longitude,categories,location,website")
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f1","name":"Café Berlage",
                          "latitude":51.44,"longitude":5.47,
                          "categories":[{"name":"Coffee Shop"},{"name":"Café"}],
                          "location":{"locality":"Eindhoven","neighborhood":["Bergen"]},
                          "website":"https://berlage.nl",
                          "rating":9.2,"price":2,
                          "photos":[{"prefix":"https://p/","suffix":"/x.jpg"}]}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10).get(0);

        assertThat(c.category()).isEqualTo("Coffee Shop");
        assertThat(c.address()).isEqualTo("Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven");
        assertThat(c.placeLink()).isEqualTo("https://berlage.nl");
        // Premium alanlar YANITTA VAR ama biz istemedigimiz icin ayristirilmiyor — sahte
        // "bos yanit oldugu icin null" degil, gercek bir ignore kaniti.
        assertThat(c.rating()).isNull();
        assertThat(c.priceLevel()).isNull();
        assertThat(c.photoUrl()).isNull();
        assertThat(c.ratingCount()).isNull();

        mock.verifyAll();
    }

    /**
     * FSQ yaniti bazen `location.neighborhood`'u bir dizi degil duz metin olarak, ya da
     * `categories`'i bos dizi olarak doner — tip uyusmazligi tum sayfayi degil SADECE
     * o alanlari dusurmeli (opt* koruması).
     */
    @Test
    void malformedCategoryAndScalarNeighbourhoodDropOnlyThoseFieldsNotTheWholeCandidate() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f3","name":"Malformed Spot",
                          "latitude":51.44,"longitude":5.47,
                          "categories":[],
                          "location":{"neighborhood":"not-an-array"}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10).get(0);

        assertThat(c.externalId()).isEqualTo("f3");
        assertThat(c.name()).isEqualTo("Malformed Spot");
        assertThat(c.category()).isNull();
        assertThat(c.locality()).isNull();
        assertThat(c.address()).isNull();
    }

    @Test
    void addressFallsBackToNeighbourhoodWhenLocalityIsMissing() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f2","name":"Kiosk",
                          "latitude":51.44,"longitude":5.47,
                          "location":{"neighborhood":["Strijp-S"]}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10).get(0);
        assertThat(c.address()).isEqualTo("Strijp-S");
        assertThat(c.locality()).isEqualTo("Strijp-S");
        assertThat(c.category()).isNull();
        assertThat(c.placeLink()).isNull();
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
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 200);

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
                List.of(ActivityType.COFFEE), 10))
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
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10))
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

        provider(http, cache).search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10);

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
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10))
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
                .search(new GeoPoint(51.5, 5.5), 5.0, List.of(ActivityType.COFFEE), 10))
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
