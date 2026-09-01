package com.bumpinto.domain.session;

/**
 * İlk beşinin Foursquare eşlemesi vardır; gerisi yalnız Google Places'ten servis edilir.
 * Gerekçe: FSQ taksonomiyi yalnız Observable iframe'inde yayınlıyor, kategori kimliği
 * doğrulanamıyor — yanlış kimlik hata vermez, sessizce yanlış mekan listeler.
 */
public enum ActivityType {
    COFFEE, FOOD, BAR, WALK, ACTIVITY,
    SWIM, HIKE, FITNESS, CINEMA, MUSEUM, ART, NIGHTLIFE, THEME_PARK, ADVENTURE, GAMES
}
