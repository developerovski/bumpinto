package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class GeoMathTest {

    // Kurucu hikaye: 's-Hertogenbosch <-> Someren
    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    @Test
    void distanceBetweenDenBoschAndSomerenIsAbout45Km() {
        double km = GeoMath.distanceKm(DEN_BOSCH, SOMEREN);
        assertThat(km).isCloseTo(44.8, org.assertj.core.data.Offset.offset(0.5));
    }

    @Test
    void distanceToSelfIsZero() {
        assertThat(GeoMath.distanceKm(DEN_BOSCH, DEN_BOSCH)).isCloseTo(0.0,
                org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void centroidOfTwoPointsIsNearArithmeticMidpointForSmallSpans() {
        GeoPoint c = centroidEqualWeights(java.util.List.of(DEN_BOSCH, SOMEREN));
        assertThat(c.lat()).isCloseTo(51.5417, org.assertj.core.data.Offset.offset(0.01));
        assertThat(c.lng()).isCloseTo(5.5079, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void centroidOfSinglePointIsItself() {
        GeoPoint c = centroidEqualWeights(java.util.List.of(DEN_BOSCH));
        assertThat(c.lat()).isCloseTo(DEN_BOSCH.lat(), org.assertj.core.data.Offset.offset(1e-9));
        assertThat(c.lng()).isCloseTo(DEN_BOSCH.lng(), org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void centroidOfEmptyListThrows() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> centroidEqualWeights(java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /**
     * Ozellik testi: aginlik = 1/hiz secildiginde iki nokta arasindaki agirlikli orta nokta,
     * iki kisinin de AYNI surede vardigi noktadir. Ayni boylamda iki nokta secildi: buyuk
     * cember dogru parcasi meridyen oldugu icin cebirsel beklenti tam tutar.
     */
    @Test
    void weightedCentroidOfTwoPeopleIsTheEqualTimePoint() {
        GeoPoint a = new GeoPoint(51.30, 5.50); // e-bisiklet
        GeoPoint b = new GeoPoint(51.70, 5.50); // araba
        GeoPoint mid = GeoMath.centroid(List.of(a, b),
                List.of(TravelMode.EBIKE.weight(), TravelMode.CAR.weight()));

        double minutesA = TravelEstimate.fromCrowKm(GeoMath.distanceKm(a, mid),
                TravelMode.EBIKE).minutes();
        double minutesB = TravelEstimate.fromCrowKm(GeoMath.distanceKm(b, mid),
                TravelMode.CAR).minutes();
        assertThat(minutesA).isCloseTo(minutesB, within(1.0)); // yuvarlama payi

        // Nokta YAVAS olana yakin durur: e-bisikletli mesafenin 1/4'unu, arabali 3/4'unu gider.
        assertThat(GeoMath.distanceKm(a, mid) / GeoMath.distanceKm(a, b))
                .isCloseTo(0.25, within(0.01));
    }

    @Test
    void badWeightsAreRejected() {
        List<GeoPoint> points = List.of(new GeoPoint(51.30, 5.50), new GeoPoint(51.70, 5.50));
        assertThatThrownBy(() -> GeoMath.centroid(points, List.of(1.0)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> GeoMath.centroid(points, List.of(1.0, 0.0)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> GeoMath.centroid(points, List.of(1.0, Double.NaN)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** GeoMath.centroid(points) tekli-agirlik kolaylik metodu silindi (uretimde cagrilan yoktu). */
    private static GeoPoint centroidEqualWeights(List<GeoPoint> points) {
        return GeoMath.centroid(points, points.stream().map(p -> 1.0).toList());
    }
}
