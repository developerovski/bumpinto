package com.bumpinto.adapter.out.routing;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Gercek OSRM sunucusuna karsi calisir; OSRM_CAR_URL yoksa atlanir (CI'da varsayilan). */
@EnabledIfEnvironmentVariable(named = "OSRM_CAR_URL", matches = ".+")
class OsrmContractTest {

    @Test
    void twoSourcesByThreeDestinationsAroundEindhovenReturnPlausibleDurations() {
        UnirestInstance http = Unirest.spawnInstance();
        try {
            AppProps props = TestProps.withRouting(new AppProps.Routing(
                    new AppProps.Routing.Osrm(System.getenv("OSRM_CAR_URL"), "", "")));
            OsrmRouting routing = new OsrmRouting(http, props);

            Optional<int[][]> result = routing.durationsSeconds(
                    List.of(new GeoPoint(51.4416, 5.4697), new GeoPoint(51.4300, 5.4800)),
                    List.of(new GeoPoint(51.6978, 5.3037), new GeoPoint(51.3855, 5.7120),
                            new GeoPoint(51.44, 5.50)),
                    TravelMode.CAR);

            assertThat(result).isPresent();
            assertThat(result.get()).hasDimensions(2, 3);
            for (int[] row : result.get()) {
                for (int seconds : row) {
                    assertThat(seconds).isBetween(1, 7199);
                }
            }
        } finally {
            http.close();
        }
    }
}
