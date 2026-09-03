package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SearchRadiusTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    @Test
    void baseRadiusIsQuarterOfMaxDistanceToCentroid() {
        GeoPoint centroid = centroidEqualWeights(List.of(DEN_BOSCH, SOMEREN));
        double base = SearchRadius.baseKm(List.of(DEN_BOSCH, SOMEREN), centroid);
        // iki nokta ~44.8 km; merkeze uzaklık ~22.4; 0.25x = ~5.6
        assertThat(base).isCloseTo(5.6, org.assertj.core.data.Offset.offset(0.2));
    }

    @Test
    void baseRadiusHasFloorOfOneKm() {
        GeoPoint centroid = centroidEqualWeights(List.of(DEN_BOSCH));
        assertThat(SearchRadius.baseKm(List.of(DEN_BOSCH), centroid)).isEqualTo(1.0);
    }

    @Test
    void baseRadiusIsCappedAtTenKm() {
        GeoPoint groningen = new GeoPoint(53.2194, 6.5665); // Den Bosch'a ~180 km
        GeoPoint centroid = centroidEqualWeights(List.of(DEN_BOSCH, groningen));
        assertThat(SearchRadius.baseKm(List.of(DEN_BOSCH, groningen), centroid)).isEqualTo(10.0);
    }

    @Test
    void expansionDoublesPerAttemptAndIsCappedAtForty() {
        assertThat(SearchRadius.expandedKm(5.0, 0)).isEqualTo(5.0);
        assertThat(SearchRadius.expandedKm(5.0, 1)).isEqualTo(10.0);
        assertThat(SearchRadius.expandedKm(5.0, 2)).isEqualTo(20.0);
        assertThat(SearchRadius.expandedKm(5.0, 3)).isEqualTo(40.0);
        assertThat(SearchRadius.expandedKm(10.0, 3)).isEqualTo(40.0); // 80 -> 40 tavan
    }

    @Test
    void expansionAttemptOutOfRangeThrows() {
        assertThatThrownBy(() -> SearchRadius.expandedKm(5.0, 4))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SearchRadius.expandedKm(5.0, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** GeoMath.centroid(points) tekli-agirlik kolaylik metodu silindi (uretimde cagrilan yoktu). */
    private static GeoPoint centroidEqualWeights(List<GeoPoint> points) {
        return GeoMath.centroid(points, points.stream().map(p -> 1.0).toList());
    }
}
