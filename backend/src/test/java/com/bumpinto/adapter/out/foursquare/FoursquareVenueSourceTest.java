package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.QuotaExceededException;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.TaglineSource;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FoursquareVenueSourceTest {

    static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    static final String BODY = """
            {"results":[{"fsq_place_id":"5a1b2c3d4e5f60718293a4b5","name":"Koffie Bar","latitude":51.44,"longitude":5.47,
             "categories":[{"id":"4bf58dd8d48988d1e0931735","name":"Coffee Shop"}],
             "location":{"locality":"Eindhoven","formatted_address":"Kleine Berg 16, Eindhoven"},
             "website":"https://koffie.example","rating":8.7,"price":2,"popularity":0.93,
             "hours":{"display":"08:00-18:00"},"closed_bucket":"VeryLikelyOpen",
             "photos":[{"id":"ph-1","prefix":"https://fastly.4sqi.net/img/general/","suffix":"/abc.jpg"}]},
             {"fsq_place_id":"6a1b2c3d4e5f60718293a4b6","name":"Kapali Bar","latitude":51.45,"longitude":5.48,
             "categories":[{"id":"4bf58dd8d48988d116941735","name":"Bar"}],"closed_bucket":"VeryLikelyClosed"}]}
            """;

    static FoursquareVenueSource source(UnirestInstance http) {
        return new FoursquareVenueSource(new VenueSourceSupport(http), TestProps.defaults(),
                new CategoryMappingLoader(), CLOCK);
    }

    /** Tek govdelik Premium arama; mock kurulumu her testte tekrarlanmasin. */
    static List<VenueCandidate> searchWith(String body) {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn(body);
        return source(http).search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE), 20)).candidates();
    }

    @Test
    void mapsPremiumFieldsAndDropsClosedVenues() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn(BODY)
                .withHeader("x-ratelimit-limit", "1000")
                .withHeader("x-ratelimit-remaining", "993")
                .withHeader("x-ratelimit-reset", String.valueOf(NOW.plusSeconds(3600).getEpochSecond()));

        FoursquareVenueSource source = source(http);
        SearchResult result = source.search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE), 20));

        assertThat(result.candidates()).hasSize(1);
        VenueCandidate c = result.candidates().get(0);
        assertThat(c.provider()).isEqualTo("foursquare");
        assertThat(c.externalId()).isEqualTo("5a1b2c3d4e5f60718293a4b5");
        assertThat(c.rating()).isEqualTo(8.7);
        assertThat(c.ratingScale()).isEqualTo(10);
        assertThat(c.popularity()).isEqualTo(0.93);
        assertThat(c.priceLevel()).isEqualTo(2);
        assertThat(c.photoUrl()).isEqualTo("https://fastly.4sqi.net/img/general/original/abc.jpg");
        assertThat(c.photoRef()).isEqualTo("ph-1");
        assertThat(c.hoursToday()).isEqualTo("08:00-18:00");
        assertThat(c.placeLink()).isEqualTo("https://koffie.example");
        assertThat(c.address()).isEqualTo("Kleine Berg 16, Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven");
        assertThat(c.category()).isEqualTo("Coffee Shop");

        assertThat(result.quota().remaining()).isEqualTo(993);
        assertThat(result.quota().source()).isEqualTo(ProviderQuota.Source.HEADER);

        assertThat(source.descriptor().ratingScale()).isEqualTo(10);
        assertThat(source.descriptor().retention()).isEqualTo(RetentionRule.STRIP_AT_EXPIRY);
    }

    @Test
    void proTierAsksOnlyProFieldsSoTheSandboxQuotaAnswers() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        // Beklenti `fields`e bagli: Premium alan istenirse eslesme olmaz ve arama patlar.
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .queryString("fields", FoursquareVenueSource.PRO_FIELDS)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"5a1b2c3d4e5f60718293a4b5","name":"Koffie Bar",
                         "latitude":51.44,"longitude":5.47,
                         "categories":[{"id":"4bf58dd8d48988d1e0931735","name":"Coffee Shop"}],
                         "location":{"locality":"Eindhoven"},"website":"https://koffie.example"}]}
                        """);
        java.util.Map<String, AppProps.VenueSourceProps> sources = new java.util.HashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "fsq-key", 450, "pro"));
        AppProps props = TestProps.of(new AppProps.Venues(sources, TestProps.venues().route()));
        FoursquareVenueSource source = new FoursquareVenueSource(new VenueSourceSupport(http), props,
                new CategoryMappingLoader(), CLOCK);

        SearchResult result = source.search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE), 20));

        VenueCandidate c = result.candidates().get(0);
        assertThat(c.name()).isEqualTo("Koffie Bar");
        assertThat(c.rating()).isNull();
        assertThat(c.photoUrl()).isNull();
        assertThat(c.hoursToday()).isNull();
        mock.verifyAll();
    }

    @Test
    void resolvesAttributionByCategoryIdEvenWithMultipleTypes() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn(BODY);

        SearchResult result = source(http).search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE, ActivityType.FOOD), 20));

        assertThat(result.candidates().get(0).activityType()).isEqualTo(ActivityType.COFFEE);

        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn(BODY);
        SearchResult barOnly = source(http).search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.BAR), 20));
        assertThat(barOnly.candidates().get(0).activityType()).isNull();
    }

    /**
     * {@code tips} ayni aramanin alanidir (ek cagri, ek kredi YOK) ve yaniti null-tolereli
     * okunur: alani gelmeyen mekanin tagline'i null kalir, kart o satiri hic cizmez (§4.9).
     */
    @Test
    void tipsFieldBecomesTaglineAndIsNullToleratedWhenAbsent() {
        // Alan istenmiyorsa esleme olu kod olurdu: istegin kendisi de sozlesmenin parcasi.
        assertThat(FoursquareVenueSource.PREMIUM_FIELDS).contains(",tips");
        String body = """
                {"results":[
                  {"fsq_place_id":"a1","name":"Kaffee","latitude":51.4,"longitude":5.4,
                   "tips":[{"text":"Best flat white in town. Roasted on site."}]},
                  {"fsq_place_id":"a2","name":"Tea","latitude":51.5,"longitude":5.5}
                ]}""";

        List<VenueCandidate> out = searchWith(body);

        assertThat(out.get(0).tagline()).isEqualTo("Best flat white in town");
        assertThat(out.get(0).taglineSource()).isEqualTo(TaglineSource.FSQ);
        assertThat(out.get(1).tagline()).isNull();
        assertThat(out.get(1).taglineSource()).isNull();
    }

    @Test
    void separatesCreditExhaustionFromHourlyRateLimit() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("{\"message\":\"Your account has no API credits remaining.\"}")
                .withStatus(429)
                .withHeader("x-ratelimit-limit", "0");

        assertThatThrownBy(() -> source(http).search(new SearchRequest(new GeoPoint(51.44, 5.47), 5.0,
                List.of(ActivityType.COFFEE), 20)))
                .isInstanceOf(QuotaExceededException.class)
                .hasMessageContaining("credits");
    }
}
