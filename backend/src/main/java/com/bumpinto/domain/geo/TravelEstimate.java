package com.bumpinto.domain.geo;

import java.util.Objects;

public record TravelEstimate(int minutes, double roadKm, TravelMode mode) {

    private static final double ROAD_FACTOR = 1.3;

    public TravelEstimate {
        Objects.requireNonNull(mode, "mode must not be null");
    }

    public static TravelEstimate fromCrowKm(double crowKm, TravelMode mode) {
        if (crowKm < 0) {
            throw new IllegalArgumentException("crowKm must be >= 0");
        }
        if (mode == null) {
            throw new IllegalArgumentException("mode must not be null");
        }
        double road = crowKm * ROAD_FACTOR;
        int minutes = (int) Math.round(road / mode.kmh() * 60);
        return new TravelEstimate(minutes, Math.round(road * 10) / 10.0, mode);
    }
}
