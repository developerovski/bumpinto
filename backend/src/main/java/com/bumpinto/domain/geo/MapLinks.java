package com.bumpinto.domain.geo;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Harita linkleri API'SIZ: koordinat + ulasim turunden uretilir, her saglayicida ayni (spec §10).
 * Google Maps URL'leri anahtar istemez ve icerik gostermez; Google disi veriyle de kullanilabilir.
 */
public final class MapLinks {

    private MapLinks() {
    }

    public static String directions(double lat, double lng, TravelMode mode) {
        return String.format(Locale.ROOT,
                "https://www.google.com/maps/dir/?api=1&destination=%s,%s&travelmode=%s",
                lat, lng, googleMode(mode));
    }

    public static String apple(double lat, double lng, TravelMode mode) {
        return String.format(Locale.ROOT, "https://maps.apple.com/?daddr=%s,%s&dirflg=%s",
                lat, lng, appleFlag(mode));
    }

    /** Mobilde yerel harita uygulamasini acan sema; ad varsa etiketlenir. */
    public static String geo(double lat, double lng, String name) {
        String base = String.format(Locale.ROOT, "geo:%s,%s?q=%s,%s", lat, lng, lat, lng);
        if (name == null || name.isBlank()) {
            return base;
        }
        return base + "(" + URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20") + ")";
    }

    private static String googleMode(TravelMode mode) {
        if (mode == null) {
            return "driving";
        }
        return switch (mode) {
            case WALK -> "walking";
            case BIKE, EBIKE -> "bicycling";
            case TRANSIT -> "transit";
            case CAR -> "driving";
        };
    }

    private static String appleFlag(TravelMode mode) {
        if (mode == null) {
            return "d";
        }
        return switch (mode) {
            case WALK -> "w";
            case BIKE, EBIKE -> "b";
            case TRANSIT -> "r";
            case CAR -> "d";
        };
    }
}
