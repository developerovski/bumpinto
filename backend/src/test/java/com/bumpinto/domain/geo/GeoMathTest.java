package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

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
        GeoPoint c = GeoMath.centroid(java.util.List.of(DEN_BOSCH, SOMEREN));
        assertThat(c.lat()).isCloseTo(51.5417, org.assertj.core.data.Offset.offset(0.01));
        assertThat(c.lng()).isCloseTo(5.5079, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void centroidOfSinglePointIsItself() {
        GeoPoint c = GeoMath.centroid(java.util.List.of(DEN_BOSCH));
        assertThat(c.lat()).isCloseTo(DEN_BOSCH.lat(), org.assertj.core.data.Offset.offset(1e-9));
        assertThat(c.lng()).isCloseTo(DEN_BOSCH.lng(), org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void centroidOfEmptyListThrows() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> GeoMath.centroid(java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
