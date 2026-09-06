package com.bumpinto.adapter.out.routing;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OsrmRoutingTest {

    static AppProps withCarUrl(String url) {
        return TestProps.withRouting(new AppProps.Routing(new AppProps.Routing.Osrm(url, "", "")));
    }

    @Test
    void parsesTheMatrixAndMarksUnreachableCellsMinusOne() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        String url = "https://osrm.example.com/table/v1/car/5.0,51.0;6.0,52.0;7.0,53.0;8.0,54.0;9.0,55.0";
        mock.expect(HttpMethod.GET, url)
                .queryString("sources", "0;1")
                .queryString("destinations", "2;3;4")
                .queryString("annotations", "duration")
                .thenReturn("""
                        {"durations":[[100,200,null],[300,400,500]]}
                        """);
        OsrmRouting routing = new OsrmRouting(http, withCarUrl("https://osrm.example.com"));

        Optional<int[][]> result = routing.durationsSeconds(
                List.of(new GeoPoint(51.0, 5.0), new GeoPoint(52.0, 6.0)),
                List.of(new GeoPoint(53.0, 7.0), new GeoPoint(54.0, 8.0), new GeoPoint(55.0, 9.0)),
                TravelMode.CAR);

        assertThat(result).isPresent();
        assertThat(result.get()).isDeepEqualTo(new int[][] {{100, 200, -1}, {300, 400, 500}});
        mock.verifyAll();
    }

    /** URL bos = profil kapali; TRANSIT'te URL olsa da rota servisi hic sorulmaz. */
    @Test
    void doesNotCallWhenProfileUrlIsBlankOrModeIsTransit() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient.register(http); // hicbir beklenti yok: bir cagri yapilsaydi burada patlardi

        OsrmRouting blank = new OsrmRouting(http, TestProps.defaults());
        assertThat(blank.durationsSeconds(List.of(new GeoPoint(51.0, 5.0)),
                List.of(new GeoPoint(52.0, 6.0)), TravelMode.CAR)).isEmpty();

        OsrmRouting configured = new OsrmRouting(http, withCarUrl("https://osrm.example.com"));
        assertThat(configured.durationsSeconds(List.of(new GeoPoint(51.0, 5.0)),
                List.of(new GeoPoint(52.0, 6.0)), TravelMode.TRANSIT)).isEmpty();
    }

    /** 500'den sonra profil 60 sn geri cekilmede: ikinci cagri aga hic cikmaz. */
    @Test
    void returnsEmptyOn500() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        String url = "https://osrm.example.com/table/v1/car/5.0,51.0;6.0,52.0";
        mock.expect(HttpMethod.GET, url).thenReturn("").withStatus(500);
        OsrmRouting routing = new OsrmRouting(http, withCarUrl("https://osrm.example.com"));

        assertThat(routing.durationsSeconds(List.of(new GeoPoint(51.0, 5.0)),
                List.of(new GeoPoint(52.0, 6.0)), TravelMode.CAR)).isEmpty();
        assertThat(routing.durationsSeconds(List.of(new GeoPoint(51.0, 5.0)),
                List.of(new GeoPoint(52.0, 6.0)), TravelMode.CAR)).isEmpty();

        mock.assertThat(HttpMethod.GET, url).wasInvokedTimes(1);
    }
}
