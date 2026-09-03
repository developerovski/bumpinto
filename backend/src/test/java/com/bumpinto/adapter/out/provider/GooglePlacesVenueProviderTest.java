package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
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

    static AppProps budget(int searches, int photos) {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), searches, photos),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
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

        assertThat(p.measureQuota().remaining()).isEqualTo(1000);
        p.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);
        p.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        ProviderQuota q = p.measureQuota();
        assertThat(q.remaining()).isEqualTo(998);
        assertThat(q.limit()).isEqualTo(1000);
        assertThat(q.source()).isEqualTo(ProviderQuota.Source.BUDGET);
        // Reset Pasifik takvim ayi basidir (Google'in faturalama saati): 1 Ekim 00:00 PDT (UTC-7).
        assertThat(q.resetAt()).isEqualTo(Instant.parse("2026-10-01T07:00:00Z"));
    }

    @Test
    void mapsSameTierEnterpriseFieldsToCandidate() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Espresso Bar"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "rating":4.6,"userRatingCount":312,
                          "businessStatus":"OPERATIONAL",
                          "primaryTypeDisplayName":{"text":"Espresso bar"},
                          "shortFormattedAddress":"Kleine Berg 16, Eindhoven",
                          "regularOpeningHours":{"weekdayDescriptions":[
                            "Monday: 8:00 AM – 6:00 PM","Tuesday: 8:00 AM – 6:00 PM",
                            "Wednesday: 8:00 AM – 6:00 PM","Thursday: 8:00 AM – 6:00 PM",
                            "Friday: 8:00 AM – 10:00 PM","Saturday: 9:00 AM – 10:00 PM",
                            "Sunday: 10:00 AM – 6:00 PM"]},
                          "addressComponents":[
                            {"longText":"16","types":["street_number"]},
                            {"longText":"Strijp-S","types":["sublocality_level_1","sublocality"]},
                            {"longText":"Eindhoven","types":["locality","political"]}],
                          "googleMapsUri":"https://maps/g1"}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);

        assertThat(c.category()).isEqualTo("Espresso bar");
        assertThat(c.address()).isEqualTo("Kleine Berg 16, Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven"); // locality, sublocality'yi yener
        assertThat(c.ratingCount()).isEqualTo(312);
        // NOW = 2026-09-02 = carsamba (Wednesday) → weekdayDescriptions[2]
        assertThat(c.hoursToday()).isEqualTo("Wednesday: 8:00 AM – 6:00 PM");
        assertThat(c.placeLink()).isEqualTo("https://maps/g1");

        // Unirest MockClient'in Assert arayuzu yalniz TAM esit header degeri dogrular
        // (hasHeaderContaining yok) — o yuzden maskenin butununu tek satirda kontrol ediyoruz.
        mock.assertThat(HttpMethod.POST, NEARBY_URL)
                .hadHeader("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos,"
                                + "places.primaryTypeDisplayName,places.businessStatus,"
                                + "places.shortFormattedAddress,places.userRatingCount,"
                                + "places.regularOpeningHours,places.addressComponents");
    }

    /**
     * Google'in siralama garantisi yok (dil bagimli); dizi PAZAR ile baslasa bile gun adi
     * eslesmesi dogru satiri bulmali, sabit "Pazartesi=index0" varsayimina duselmemeli.
     */
    @Test
    void hoursTodayMatchesByDayNamePrefixWhenArrayIsSundayFirst() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Espresso Bar"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "businessStatus":"OPERATIONAL",
                          "regularOpeningHours":{"weekdayDescriptions":[
                            "Sunday: 10:00 AM – 6:00 PM","Monday: 8:00 AM – 6:00 PM",
                            "Tuesday: 8:00 AM – 6:00 PM","Wednesday: 8:00 AM – 6:00 PM",
                            "Thursday: 8:00 AM – 6:00 PM","Friday: 8:00 AM – 10:00 PM",
                            "Saturday: 9:00 AM – 10:00 PM"]}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);

        // NOW = 2026-09-02 = carsamba (Wednesday); dizi Pazar-ilk, index-tabanli okuma yanlis
        // gunu (Tuesday) dondururdu — isim eslesmesi dogru satiri bulur.
        assertThat(c.hoursToday()).isEqualTo("Wednesday: 8:00 AM – 6:00 PM");
    }

    @Test
    void localityFallsBackToSublocalityWhenGoogleOmitsTheCity() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g3","displayName":{"text":"Kiosk"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "addressComponents":[
                            {"longText":"Strijp-S","types":["sublocality_level_1","sublocality"]}]}]}
                        """);

        assertThat(provider(http).search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10)
                .get(0).locality()).isEqualTo("Strijp-S");
    }

    @Test
    void closedPlacesAreDroppedSilentlyAndPhotosStayAligned() {
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

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).externalId()).isEqualTo("acik");
        assertThat(out.get(0).photoUrl()).isEqualTo("https://lh3/acik=w1000");
    }

    @Test
    void placeLinkFallsBackToPlaceIdSearchUrlWhenGoogleOmitsTheUri() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g9","displayName":{"text":"Café Berlage"},
                          "location":{"latitude":51.44,"longitude":5.47}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);
        assertThat(c.placeLink()).isEqualTo(
                "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9+Berlage&query_place_id=g9");
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
        assertThat(p.measureQuota().remaining()).isEqualTo(999);

        // Sinir Pasifik takvim ayidir: 1 Ekim 00:00 PDT (UTC-7) = 07:00 UTC, saat degil.
        now.set(Instant.parse("2026-10-01T07:00:01Z"));
        assertThat(p.measureQuota().remaining()).isEqualTo(1000);
    }

    @Test
    void nearbyBudgetIsAHardCapNotJustAReport() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Tek"},
                          "location":{"latitude":51.44,"longitude":5.47}}]}
                        """);
        GooglePlacesVenueProvider provider = new GooglePlacesVenueProvider(http, budget(1, 10),
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(provider.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .hasSize(1);
        // Butce bitti: ikinci arama aga CIKMAZ, orkestrator baska saglayiciya gecsin diye
        // QuotaExceededException atilir.
        assertThatThrownBy(() -> provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10))
                .isInstanceOf(QuotaExceededException.class);
        mock.assertThat(HttpMethod.POST, NEARBY_URL).wasInvokedTimes(1);
        assertThat(provider.measureQuota().remaining()).isZero();
    }

    @Test
    void photoBudgetExhaustionLeavesVenuesWithoutPhotosButKeepsTheSearch() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[
                          {"id":"g1","displayName":{"text":"Bir"},
                           "location":{"latitude":51.44,"longitude":5.47},
                           "photos":[{"name":"places/g1/photos/REF1"}]},
                          {"id":"g2","displayName":{"text":"Iki"},
                           "location":{"latitude":51.45,"longitude":5.48},
                           "photos":[{"name":"places/g2/photos/REF2"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/g1=w1000"}
                        """);
        GooglePlacesVenueProvider provider = new GooglePlacesVenueProvider(http, budget(10, 1),
                Clock.fixed(NOW, ZoneOffset.UTC));

        List<VenueCandidate> out = provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10);

        assertThat(out).hasSize(2);
        assertThat(out.get(0).photoUrl()).isEqualTo("https://lh3/g1=w1000");
        assertThat(out.get(1).photoUrl()).isNull(); // butce bitti → monogram fallback
    }

    /** Foto sayaci SUREC ICI kalir: ikinci arama, ilk aramanin harcadigi butceyi gorur. */
    @Test
    void photoCounterPersistsAcrossTwoSearchesInTheSameMonth() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Bir"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "photos":[{"name":"places/g1/photos/REF1"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/g1=w1000"}
                        """);
        GooglePlacesVenueProvider provider = new GooglePlacesVenueProvider(http, budget(10, 1),
                Clock.fixed(NOW, ZoneOffset.UTC));

        List<VenueCandidate> first = provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10);
        assertThat(first.get(0).photoUrl()).isEqualTo("https://lh3/g1=w1000");

        // Ikinci arama AYNI aydadir: tek birimlik foto butcesi ilk aramada tukendi, sayac
        // ikinci aramada SIFIRLANMAZ — venue fotosuz kalir.
        List<VenueCandidate> second = provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10);
        assertThat(second.get(0).photoUrl()).isNull();
        mock.assertThat(HttpMethod.GET,
                "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .wasInvokedTimes(1);
    }
}
