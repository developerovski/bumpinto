package com.bumpinto.adapter.out.geocode;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class NominatimReverseGeocoderTest {

    static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

    static AppProps props(Duration minInterval) {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", minInterval));
    }

    static NominatimReverseGeocoder geocoder(UnirestInstance http, Duration minInterval) {
        return new NominatimReverseGeocoder(http, props(minInterval));
    }

    @Test
    void readsTownNameAndSendsMandatoryUserAgentAndZoom() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        // Bekleme yalnizca bu tam eslesmede karsilik bulur: User-Agent, zoom ve format
        // yanlissa istek varsayilan (bos) yanit alir ve asagidaki assertion'lar kirmiziya doner.
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .header("User-Agent", "BumpInto/0.1 (ops@bumpinto.test)")
                .queryString("zoom", "10")
                .queryString("format", "jsonv2")
                .thenReturn("""
                        {"address":{"town":"Someren","county":"Noord-Brabant","country":"Nederland"}}
                        """);

        assertThat(geocoder(http, Duration.ZERO).label(new GeoPoint(51.3855, 5.7120)))
                .contains("Someren");

        mock.verifyAll();
    }

    /** Anahtar YUVARLANMIS konum: ayni ~1 km kutusundaki ikinci istek aga CIKMAZ. */
    @Test
    void cachesByApproxLocation() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"city":"Eindhoven"}}
                        """);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44123, 5.47456))).contains("Eindhoven");
        assertThat(geocoder.label(new GeoPoint(51.43987, 5.47021))).contains("Eindhoven");

        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(1);
    }

    @Test
    void throttlesToAtMostOneRequestPerInterval() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"village":"Nuenen"}}
                        """);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ofMillis(200));

        long start = System.nanoTime();
        geocoder.label(new GeoPoint(51.47, 5.55));
        geocoder.label(new GeoPoint(51.60, 5.20)); // farkli kutu → cache kacisi
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(elapsedMs).isGreaterThanOrEqualTo(180);
    }

    @Test
    void failureIsSilentAndNotCached() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL).thenReturn("").withStatus(503);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());
        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());

        // Transport hatasi onbellege girmez: ikinci cagri da aga cikar (kesinti gecici olabilir).
        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(2);
    }

    /** Basarili ama adressiz yanit MISS olarak onbellege girer: adsiz kutu tekrar cekilmez. */
    @Test
    void cachesSuccessfulResponseWithNoMatchingAddressKeyAsMiss() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"country":"Nederland"}}
                        """);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());
        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());

        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(1);
    }
}
