package com.bumpinto.domain.geo;

import java.util.List;

public final class GeoMath {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private GeoMath() {
    }

    public static double distanceKm(GeoPoint a, GeoPoint b) {
        double dLat = Math.toRadians(b.lat() - a.lat());
        double dLng = Math.toRadians(b.lng() - a.lng());
        double lat1 = Math.toRadians(a.lat());
        double lat2 = Math.toRadians(b.lat());
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
    }

    /**
     * Agirlikli kuresel merkez. {@code weights} null ise esit agirlik (eski davranis).
     * Agirlik = 1/hiz (bkz. {@link TravelMode#weight()}): yavas gelen orta noktayi kendine
     * ceker. Iki noktada sonuc TAM esit sure noktasidir; uc ve fazlasinda yaklasiktir
     * (spec §4.5b bunu boyle kabul ediyor).
     */
    public static GeoPoint centroid(List<GeoPoint> points, List<Double> weights) {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException("points must not be empty");
        }
        if (weights != null && weights.size() != points.size()) {
            throw new IllegalArgumentException("weights must match points");
        }
        double x = 0;
        double y = 0;
        double z = 0;
        double total = 0;
        for (int i = 0; i < points.size(); i++) {
            GeoPoint p = points.get(i);
            double w = weights == null ? 1.0 : weights.get(i);
            if (!Double.isFinite(w) || w <= 0) {
                throw new IllegalArgumentException("weights must be finite and > 0");
            }
            double lat = Math.toRadians(p.lat());
            double lng = Math.toRadians(p.lng());
            x += w * Math.cos(lat) * Math.cos(lng);
            y += w * Math.cos(lat) * Math.sin(lng);
            z += w * Math.sin(lat);
            total += w;
        }
        x /= total;
        y /= total;
        z /= total;
        double lng = Math.atan2(y, x);
        double hyp = Math.sqrt(x * x + y * y);
        double lat = Math.atan2(z, hyp);
        return new GeoPoint(Math.toDegrees(lat), Math.toDegrees(lng));
    }
}
