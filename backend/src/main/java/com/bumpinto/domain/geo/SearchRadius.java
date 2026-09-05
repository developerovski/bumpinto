package com.bumpinto.domain.geo;

import java.util.List;

public final class SearchRadius {

    static final double MIN_KM = 1.0;
    static final double BASE_MAX_KM = 10.0;
    static final double ABSOLUTE_MAX_KM = 40.0;
    public static final int MAX_EXPANSIONS = 3;
    private static final double SPREAD_FACTOR = 0.25;
    // Besinci yaricap sabiti burada DEGIL: capali oturumun sabiti
    // SessionCenter.ANCHOR_RADIUS_KM — o bir arama merdiveni degil, capa semantigi.

    private SearchRadius() {
    }

    public static double baseKm(List<GeoPoint> participants, GeoPoint centroid) {
        double maxDist = participants.stream()
                .mapToDouble(p -> GeoMath.distanceKm(p, centroid))
                .max()
                .orElseThrow(() -> new IllegalArgumentException("participants must not be empty"));
        return clamp(maxDist * SPREAD_FACTOR, MIN_KM, BASE_MAX_KM);
    }

    public static double expandedKm(double baseKm, int attempt) {
        if (attempt < 0 || attempt > MAX_EXPANSIONS) {
            throw new IllegalArgumentException("attempt must be in 0.." + MAX_EXPANSIONS);
        }
        return Math.min(baseKm * Math.pow(2, attempt), ABSOLUTE_MAX_KM);
    }

    private static double clamp(double value, double lo, double hi) {
        return Math.max(lo, Math.min(hi, value));
    }
}
