package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MapLinksTest {

    @Test
    void directionsCarriesTheViewersTravelModeAndDefaultsToDriving() {
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.WALK))
                .isEqualTo("https://www.google.com/maps/dir/?api=1&destination=51.44,5.47&travelmode=walking");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.BIKE)).endsWith("bicycling");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.EBIKE)).endsWith("bicycling");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.TRANSIT)).endsWith("transit");
        assertThat(MapLinks.directions(51.44, 5.47, TravelMode.CAR)).endsWith("driving");
        assertThat(MapLinks.directions(51.44, 5.47, null)).endsWith("driving");
    }

    @Test
    void appleAndGeoLinks() {
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.WALK))
                .isEqualTo("https://maps.apple.com/?daddr=51.44,5.47&dirflg=w");
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.EBIKE)).endsWith("dirflg=b");
        assertThat(MapLinks.apple(51.44, 5.47, TravelMode.TRANSIT)).endsWith("dirflg=r");

        assertThat(MapLinks.geo(51.44, 5.47, "Café & Bar"))
                .isEqualTo("geo:51.44,5.47?q=51.44,5.47(Caf%C3%A9%20%26%20Bar)");
        assertThat(MapLinks.geo(51.44, 5.47, null)).isEqualTo("geo:51.44,5.47?q=51.44,5.47");
    }
}
