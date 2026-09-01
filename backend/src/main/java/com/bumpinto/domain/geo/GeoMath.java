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

    public static GeoPoint centroid(List<GeoPoint> points) {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException("points must not be empty");
        }
        double x = 0;
        double y = 0;
        double z = 0;
        for (GeoPoint p : points) {
            double lat = Math.toRadians(p.lat());
            double lng = Math.toRadians(p.lng());
            x += Math.cos(lat) * Math.cos(lng);
            y += Math.cos(lat) * Math.sin(lng);
            z += Math.sin(lat);
        }
        int n = points.size();
        x /= n;
        y /= n;
        z /= n;
        double lng = Math.atan2(y, x);
        double hyp = Math.sqrt(x * x + y * y);
        double lat = Math.atan2(z, hyp);
        return new GeoPoint(Math.toDegrees(lat), Math.toDegrees(lng));
    }
}
