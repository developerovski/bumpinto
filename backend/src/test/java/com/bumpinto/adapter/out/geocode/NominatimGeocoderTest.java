package com.bumpinto.adapter.out.geocode;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.GeocodeBusyException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.GeoResult;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NominatimGeocoderTest {

    static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
    static final String SEARCH_URL = "https://nominatim.openstreetmap.org/search";

    static AppProps props(Duration minInterval) {
        return TestProps.withGeocode(new AppProps.Geocode("ops@bumpinto.test", minInterval,
                "nominatim", "https://nominatim.openstreetmap.org"));
    }

    static NominatimGeocoder geocoder(UnirestInstance http, Duration minInterval) {
        return new NominatimGeocoder(http, props(minInterval));
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
        NominatimGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44123, 5.47456))).contains("Eindhoven");
        assertThat(geocoder.label(new GeoPoint(51.43987, 5.47021))).contains("Eindhoven");

        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(1);
    }

    /**
     * Throttle artik BLOKLAMAZ (K-B22): dolu pencerede ikinci cagri hemen (< 1 s) bos doner,
     * bir sonraki poll'da yeniden denenir — eskiden oldugu gibi Thread.sleep ile beklemez.
     */
    @Test
    void throttleSkipsSecondReverseRequestInsteadOfSleeping() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"village":"Nuenen"}}
                        """);
        NominatimGeocoder geocoder = geocoder(http, Duration.ofMinutes(5));

        long start = System.nanoTime();
        assertThat(geocoder.label(new GeoPoint(51.47, 5.55))).contains("Nuenen");
        assertThat(geocoder.label(new GeoPoint(51.60, 5.20))).isEmpty(); // farkli kutu, throttle atlar
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(elapsedMs).isLessThan(1000);
        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(1);
    }

    @Test
    void failureIsSilentAndNotCached() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL).thenReturn("").withStatus(503);
        NominatimGeocoder geocoder = geocoder(http, Duration.ZERO);

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
        NominatimGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());
        assertThat(geocoder.label(new GeoPoint(51.44, 5.47))).isEqualTo(Optional.empty());

        mock.assertThat(HttpMethod.GET, REVERSE_URL).wasInvokedTimes(1);
    }

    /** Ilk sonuc doner; bos dizi ve 500 ikisi de bos Optional'a — hicbiri hata firlatmaz. */
    @Test
    void forwardReturnsFirstHitAndEmptyOnNoHitsOr500() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        [{"lat":"51.4416","lon":"5.4697","display_name":"Eindhoven, Nederland"}]
                        """);
        NominatimGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.forward("Eindhoven", null))
                .contains(new GeoResult(new GeoPoint(51.4416, 5.4697), "Eindhoven, Nederland"));

        mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn("[]");
        assertThat(geocoder.forward("Nowhereville", null)).isEmpty();

        mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL).thenReturn("").withStatus(500);
        assertThat(geocoder.forward("Eindhoven", null)).isEmpty();
    }

    /**
     * forward() da AYNI pencereyi paylasir: pencere doluyken ikinci cagri hemen (< 1 s)
     * GeocodeBusyException firlatir — "sonuc yok" ile karistirilmasin.
     */
    @Test
    void throttleSkipsInsteadOfSleeping() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        [{"lat":"51.4416","lon":"5.4697","display_name":"Eindhoven, Nederland"}]
                        """);
        NominatimGeocoder geocoder = geocoder(http, Duration.ofMinutes(5));

        assertThat(geocoder.forward("Eindhoven", null)).isPresent();

        long start = System.nanoTime();
        assertThatThrownBy(() -> geocoder.forward("Nuenen", null))
                .isInstanceOf(GeocodeBusyException.class);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(elapsedMs).isLessThan(1000);
    }

    /**
     * Viewbox onyargi noktasi cevresinde ~40km: lng±0.5, lat±0.36 — sonuc disarida da olabilir,
     * yalnizca oncelik verir.
     */
    @Test
    void forwardSendsViewboxAroundTheBias() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .queryString("viewbox", "4.97,51.8,5.97,51.08")
                .thenReturn("""
                        [{"lat":"51.4416","lon":"5.4697","display_name":"Kleine Berg, Eindhoven"}]
                        """);
        NominatimGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.forward("Kleine Berg", new GeoPoint(51.4416, 5.4697))).isPresent();

        mock.verifyAll();
    }
}
