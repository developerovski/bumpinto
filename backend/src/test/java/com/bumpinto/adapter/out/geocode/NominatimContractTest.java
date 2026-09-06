package com.bumpinto.adapter.out.geocode;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.Test;

/**
 * GERCEK Nominatim'e karsi sozlesme testi: yalniz {@code GEOCODE_BASE_URL} tanimliysa calisir
 * (CI'da varsayilan atlanir — dis servise bagimlilik).
 */
@EnabledIfEnvironmentVariable(named = "GEOCODE_BASE_URL", matches = ".+")
class NominatimContractTest {

    static NominatimGeocoder geocoder() {
        UnirestInstance http = Unirest.spawnInstance();
        AppProps props = TestProps.withGeocode(new AppProps.Geocode("ops@bumpinto.test",
                Duration.ofSeconds(1), System.getenv("GEOCODE_BASE_URL")));
        return new NominatimGeocoder(http, props);
    }

    @Test
    void forwardFindsEindhovenInsideTheNetherlands() {
        Optional<com.bumpinto.domain.geo.GeoResult> result = geocoder().forward("Eindhoven", null);

        assertThat(result).isPresent();
        GeoPoint point = result.get().point();
        assertThat(point.lat()).isBetween(50.7, 53.6);
        assertThat(point.lng()).isBetween(3.2, 7.3);
    }

    @Test
    void reverseReturnsANonBlankLabelForEindhoven() {
        Optional<String> label = geocoder().label(new GeoPoint(51.4416, 5.4697));

        assertThat(label).isPresent();
        assertThat(label.get()).isNotBlank();
    }
}
