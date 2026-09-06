package com.bumpinto.adapter.out.google;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.QuotaExceededException;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GooglePlacesVenueSourceTest {

    static final String NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
    static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    static GooglePlacesVenueSource source(UnirestInstance http) {
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>(TestProps.venues().sources());
        sources.put("google", new AppProps.VenueSourceProps(true, "g-key", 1000));
        AppProps props = TestProps.of(new AppProps.Venues(sources, TestProps.venues().route()));
        return new GooglePlacesVenueSource(new VenueSourceSupport(http), props,
                new CategoryMappingLoader(), CLOCK);
    }

    @Test
    void descriptorForcesGoogleMapEngineAndPacificBilling() {
        VenueSourceDescriptor d = source(Unirest.spawnInstance()).descriptor();

        assertThat(d.id()).isEqualTo("google");
        assertThat(d.requiredMapEngine()).isEqualTo(MapEngine.GOOGLE);
        assertThat(d.billingZone()).isEqualTo(ZoneId.of("America/Los_Angeles"));
        assertThat(d.ratingScale()).isEqualTo(5);
        assertThat(d.retention()).isEqualTo(RetentionRule.STRIP_AT_EXPIRY);
        assertThat(d.attributionKey()).isEqualTo("attribution.google");
    }

    /** includedTypes YAML'dan gelir (CategoryMappingLoader) ve duz bir dize dizisine iner. */
    @Test
    void buildsIncludedTypesFromYamlAsAFlatArray() {
        GooglePlacesVenueSource source = source(Unirest.spawnInstance());
        SearchRequest request = new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.SWIM, ActivityType.HIKE), 50);
        List<String> ids = source.categories().idsFor(request.types());

        var body = GooglePlacesVenueSource.requestBody(request, ids);
        List<Object> includedTypes = body.getJSONArray("includedTypes").toList();

        assertThat(includedTypes).containsExactly(
                "swimming_pool", "water_park", "hiking_area", "national_park", "state_park");
        assertThat(body.getString("rankPreference")).isEqualTo("DISTANCE");
        assertThat(body.getInt("maxResultCount")).isEqualTo(20);
    }

    @Test
    void mapsGoogleMapsUriToPlaceLinkAndKeepsEnterpriseFields() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Espresso Bar"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "rating":4.3,"priceLevel":"PRICE_LEVEL_MODERATE",
                          "userRatingCount":312,"businessStatus":"OPERATIONAL",
                          "googleMapsUri":"https://maps/g1",
                          "photos":[{"name":"places/g1/photos/REF1"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/g1=w1000"}
                        """);

        SearchResult result = source(http).search(new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.COFFEE), 10));

        assertThat(result.candidates()).hasSize(1);
        VenueCandidate c = result.candidates().get(0);
        assertThat(c.placeLink()).isEqualTo("https://maps/g1");
        assertThat(c.ratingScale()).isEqualTo(5);
        assertThat(c.rating()).isEqualTo(4.3);
        assertThat(c.priceLevel()).isEqualTo(2);
        assertThat(c.photoUrl()).isEqualTo("https://lh3/g1=w1000");
        assertThat(c.photoRef()).isEqualTo("places/g1/photos/REF1");
        assertThat(result.quota()).isNull();
    }

    @Test
    void dropsNonOperationalPlacesBeforeResolvingPhotos() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[
                          {"id":"kapali","displayName":{"text":"Kapanmis"},
                           "location":{"latitude":51.44,"longitude":5.47},
                           "businessStatus":"CLOSED_PERMANENTLY",
                           "photos":[{"name":"places/kapali/photos/REF0"}]},
                          {"id":"acik","displayName":{"text":"Acik"},
                           "location":{"latitude":51.45,"longitude":5.48},
                           "businessStatus":"OPERATIONAL",
                           "photos":[{"name":"places/acik/photos/REF1"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/acik/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/acik=w1000"}
                        """);

        SearchResult result = source(http).search(new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.COFFEE), 10));

        assertThat(result.candidates()).hasSize(1);
        assertThat(result.candidates().get(0).externalId()).isEqualTo("acik");
        // "kapali" icin foto adresi asla cagrilmadi: kayit YALNIZ "acik" REF1 icin.
        mock.assertThat(HttpMethod.GET,
                "https://places.googleapis.com/v1/places/acik/photos/REF1/media")
                .wasInvokedTimes(1);
    }

    /** Atif yalniz SECILEN turlere: bar+cafe turlu mekan COFFEE isteginde COFFEE, FOOD isteginde null. */
    @Test
    void attributesOnlyToRequestedTypes() {
        String body = """
                {"places":[{"id":"g1","displayName":{"text":"Karma Mekan"},
                  "location":{"latitude":51.44,"longitude":5.47},
                  "businessStatus":"OPERATIONAL",
                  "primaryType":"bar","types":["bar","cafe"]}]}
                """;
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn(body);

        SearchResult coffee = source(http).search(new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.COFFEE), 10));
        assertThat(coffee.candidates().get(0).activityType()).isEqualTo(ActivityType.COFFEE);

        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn(body);
        SearchResult food = source(http).search(new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.FOOD), 10));
        assertThat(food.candidates().get(0).activityType()).isNull();
    }

    @Test
    void rateLimitBecomesQuotaExceeded() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}").withStatus(429);

        assertThatThrownBy(() -> source(http).search(new SearchRequest(new GeoPoint(51.5, 5.5), 5.0,
                List.of(ActivityType.COFFEE), 10)))
                .isInstanceOf(QuotaExceededException.class);
    }
}
