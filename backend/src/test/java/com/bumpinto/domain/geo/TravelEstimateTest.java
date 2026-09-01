package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TravelEstimateTest {

    @Test
    void thirtyOnePointFiveCrowKmBecomesFortyOneRoadKmAndThirtyFourMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(31.5);
        assertThat(e.roadKm()).isEqualTo(41.0);   // 31.5 * 1.3 = 40.95 -> 41.0 (1 ondalik)
        assertThat(e.minutes()).isEqualTo(34);    // 40.95 / 72 * 60 = 34.1 -> 34
    }

    @Test
    void zeroDistanceIsZeroMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(0);
        assertThat(e.roadKm()).isEqualTo(0.0);
        assertThat(e.minutes()).isEqualTo(0);
    }

    @Test
    void negativeDistanceThrows() {
        assertThatThrownBy(() -> TravelEstimate.fromCrowKm(-1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
