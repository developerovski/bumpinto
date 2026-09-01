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

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FoursquareVenueProviderTest {

    static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";

    static AppProps props() {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false));
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

        List<VenueCandidate> out = new FoursquareVenueProvider(http, props())
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

        List<VenueCandidate> out = new FoursquareVenueProvider(http, props())
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

        List<VenueCandidate> out = new FoursquareVenueProvider(http, props())
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 200);

        assertThat(out).isEmpty();
        mock.verifyAll();
    }

    @Test
    void throwsProviderExceptionOnErrorStatus() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn("{}").withStatus(503);

        FoursquareVenueProvider provider = new FoursquareVenueProvider(http, props());

        assertThatThrownBy(() -> provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10))
                .isInstanceOf(ProviderException.class)
                .hasMessageContaining("503")
                .hasMessageNotContaining("fsq-key");
    }
}
