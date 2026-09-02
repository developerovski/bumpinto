package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GooglePlacesVenueProviderTest {

    static final String NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
    static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");

    static GooglePlacesVenueProvider provider(UnirestInstance http) {
        return new GooglePlacesVenueProvider(http, FoursquareVenueProviderTest.props(),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void parsesNearbyResponseAndMapsPriceLevel() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Yedek Mekan"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "rating":4.2,"priceLevel":"PRICE_LEVEL_INEXPENSIVE",
                          "googleMapsUri":"https://maps/g1"}]}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        VenueCandidate c = out.get(0);
        assertThat(c.provider()).isEqualTo("google");
        assertThat(c.externalId()).isEqualTo("g1");
        assertThat(c.name()).isEqualTo("Yedek Mekan");
        assertThat(c.rating()).isEqualTo(4.2);
        assertThat(c.priceLevel()).isEqualTo(1);
        assertThat(c.mapsUrl()).isEqualTo("https://maps/g1");
        assertThat(c.photoUrl()).isNull();
    }

    /** Foto referansi aramada cozulur: kolonda imzali CDN adresi durur, istemci tek istek atar. */
    @Test
    void resolvesFirstPhotoToCdnUri() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Fotolu"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "photos":[{"name":"places/g1/photos/REF1"},
                                    {"name":"places/g1/photos/REF2"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/g1=w1000"}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out.get(0).photoUrl()).isEqualTo("https://lh3/g1=w1000");
    }

    /**
     * Silinmis referans olagandir: o mekan fotosuz kalir, arama DUSMEZ. Aksi halde tek bozuk
     * foto tum destenin kurulmasini engellerdi.
     */
    @Test
    void keepsVenueWithoutPhotoWhenMediaCallFails() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Olu Foto"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "photos":[{"name":"places/g1/photos/REF1"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("gone").withStatus(404);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).photoUrl()).isNull();
    }

    /** Fotosuz mekan icin medya cagrisi HIC yapilmaz — bosuna ucretli istek atilmasin. */
    @Test
    void skipsMediaCallWhenPlaceHasNoPhotos() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Fotosuz"},
                          "location":{"latitude":51.44,"longitude":5.47}}]}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out.get(0).photoUrl()).isNull();
        mock.verifyAll();
    }

    /** Yeni bir ActivityType eklenip Google eslemesi unutulursa o tur calisma aninda patlar. */
    @Test
    void everyActivityTypeIsMappedToAtLeastOneGoogleType() {
        for (ActivityType type : ActivityType.values()) {
            assertThat(GooglePlacesVenueProvider.TYPES.get(type))
                    .as("google type mapping for %s", type)
                    .isNotNull().isNotEmpty();
        }
    }

    /** includedTypes duz dize dizisi olmali; ic ice dizi Google'da sessizce filtresiz sonuc verir. */
    @Test
    void buildsFlatIncludedTypesArrayForMultiTypeActivity() {
        JSONArray types = GooglePlacesVenueProvider
                .requestBody(new GeoPoint(51.5, 5.5), 5.0, ActivityType.SWIM, 10)
                .getJSONArray("includedTypes");

        assertThat(types.length()).isEqualTo(2);
        assertThat(types.getString(0)).isEqualTo("swimming_pool");
        assertThat(types.getString(1)).isEqualTo("water_park");
    }

    @Test
    void returnsEmptyListWhenNoPlaces() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}");

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).isEmpty();
    }

    /** 429 = kota bitti; diger hatalardan ayri tip, Resilient devreyi buna gore acar. */
    @Test
    void mapsTooManyRequestsToQuotaExceeded() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}").withStatus(429);

        assertThatThrownBy(() -> provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .isInstanceOf(QuotaExceededException.class);
    }

    /** Google telemetri vermez: kota = butce − yerel sayac; yalniz searchNearby sayilir. */
    @Test
    void quotaIsBudgetMinusLocalCallCount() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}");
        GooglePlacesVenueProvider p = provider(http);

        assertThat(p.measureQuota().remaining()).isEqualTo(5000);
        p.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);
        p.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        ProviderQuota q = p.measureQuota();
        assertThat(q.remaining()).isEqualTo(4998);
        assertThat(q.limit()).isEqualTo(5000);
        assertThat(q.source()).isEqualTo(ProviderQuota.Source.BUDGET);
        assertThat(q.resetAt()).isEqualTo(Instant.parse("2026-10-01T00:00:00Z"));
    }

    /** Ay donunce sayac sifirlanir — eski ayin harcamasi yeni butceyi yemez. */
    @Test
    void callCounterResetsOnNewMonth() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}");
        java.util.concurrent.atomic.AtomicReference<Instant> now = new java.util.concurrent.atomic.AtomicReference<>(NOW);
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId z) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        GooglePlacesVenueProvider p = new GooglePlacesVenueProvider(http,
                FoursquareVenueProviderTest.props(), clock);

        p.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);
        assertThat(p.measureQuota().remaining()).isEqualTo(4999);

        now.set(Instant.parse("2026-10-01T00:00:01Z"));
        assertThat(p.measureQuota().remaining()).isEqualTo(5000);
    }
}
