package com.bumpinto.domain.geo;

import java.util.List;

/**
 * Capasiz oturumda grubun izin verilen yayilimi. Hollanda'daki host ile Turkiye'den katilan
 * biri arasindaki "orta nokta" Balkanlar'da bir tarladir; sessizce uretilen anlamsiz bir
 * merkez hatanin en pahali bicimidir.
 *
 * <p>Olcu CAP'tir (en uzak ikili mesafe), centroid'e uzaklik degil: agirlikli centroid ulasim
 * moduna gore kayar ve yuruyen biri katilinca HIC KIMILDAMAMIS bir arabali menzil disina
 * dusebilirdi (spec S1). Cap ayrica monotondur: yeni gelen capi yalniz buyutur, dolayisiyla
 * kurali bozan HER ZAMAN yeni gelendir ve kimse geriye donuk disari dusmez (spec S2).
 */
public final class SpreadLimit {

    public static final double MAX_SPREAD_KM = 100.0;

    /**
     * Degismez ZATEN gecerli oldugu icin tam cap hesabina gerek yok: yalniz ADAYI mevcut
     * noktalara olcmek yeter. O(n), O(n^2) degil (spec S3).
     */
    public static boolean exceeded(GeoPoint candidate, List<GeoPoint> existing) {
        return existing.stream().anyMatch(p -> GeoMath.distanceKm(candidate, p) > MAX_SPREAD_KM);
    }

    private SpreadLimit() {
    }
}
