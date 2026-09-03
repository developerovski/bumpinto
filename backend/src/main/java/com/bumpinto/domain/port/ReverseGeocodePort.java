package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;

import java.util.Optional;

/**
 * Bir koordinati insanin soyleyecegi kelimeye cevirir ("Eindhoven", "Someren").
 * Haritanin turetilemeyen TEK bilgisi budur (spec §0): kalan her sey kisi basi dakikadan
 * uretilir. Basarisizlik NORMALDIR — cagiran null etiketle devam eder.
 */
public interface ReverseGeocodePort {

    Optional<String> label(GeoPoint point);
}
