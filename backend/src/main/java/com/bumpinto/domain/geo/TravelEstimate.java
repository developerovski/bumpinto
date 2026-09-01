package com.bumpinto.domain.geo;

public record TravelEstimate(int minutes, double roadKm) {

    private static final double ROAD_FACTOR = 1.3;
    private static final double AVG_SPEED_KMH = 72.0;

    public static TravelEstimate fromCrowKm(double crowKm) {
        if (crowKm < 0) {
            throw new IllegalArgumentException("crowKm must be >= 0");
        }
        double road = crowKm * ROAD_FACTOR;
        int minutes = (int) Math.round(road / AVG_SPEED_KMH * 60);
        return new TravelEstimate(minutes, Math.round(road * 10) / 10.0);
    }
}
