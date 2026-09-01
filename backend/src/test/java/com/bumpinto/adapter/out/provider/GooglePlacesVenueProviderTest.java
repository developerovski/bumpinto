package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GooglePlacesVenueProviderTest {

    static final String NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

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

        List<VenueCandidate> out = new GooglePlacesVenueProvider(http,
                FoursquareVenueProviderTest.props())
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        VenueCandidate c = out.get(0);
        assertThat(c.provider()).isEqualTo("google");
        assertThat(c.externalId()).isEqualTo("g1");
        assertThat(c.name()).isEqualTo("Yedek Mekan");
        assertThat(c.rating()).isEqualTo(4.2);
        assertThat(c.priceLevel()).isEqualTo(1);
        assertThat(c.mapsUrl()).isEqualTo("https://maps/g1");
    }

    @Test
    void returnsEmptyListWhenNoPlaces() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL).thenReturn("{}");

        List<VenueCandidate> out = new GooglePlacesVenueProvider(http,
                FoursquareVenueProviderTest.props())
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).isEmpty();
    }
}
