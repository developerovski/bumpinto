package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TravelEstimateTest {

    @Test
    void thirtyOnePointFiveCrowKmBecomesFortyOneRoadKmAndThirtyFourMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(31.5, TravelMode.CAR);
        assertThat(e.roadKm()).isEqualTo(41.0);   // 31.5 * 1.3 = 40.95 -> 41.0 (1 ondalik)
        assertThat(e.minutes()).isEqualTo(34);    // 40.95 / 72 * 60 = 34.1 -> 34
    }

    @Test
    void zeroDistanceIsZeroMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(0, TravelMode.CAR);
        assertThat(e.roadKm()).isEqualTo(0.0);
        assertThat(e.minutes()).isEqualTo(0);
    }

    @Test
    void negativeDistanceThrows() {
        assertThatThrownBy(() -> TravelEstimate.fromCrowKm(-1, TravelMode.CAR))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void everyModeUsesItsOwnSpeedWithTheSameDetourFactor() {
        // 10 km kus ucusu → 13 km yol; dakika = 13 / hiz * 60
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.WALK).minutes()).isEqualTo(156);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.BIKE).minutes()).isEqualTo(49);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.EBIKE).minutes()).isEqualTo(33);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.TRANSIT).minutes()).isEqualTo(39);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.CAR).minutes()).isEqualTo(11);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.CAR).roadKm()).isEqualTo(13.0);
    }
}
