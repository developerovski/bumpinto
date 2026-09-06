package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

/**
 * Saglayicidan gelen ham aday. Yeni alanlar (spec §5.A.5) OPSIYONELDIR: saglayici vermezse
 * null kalir ve UI o satiri hic cizmez — "veri yokken bos etiket" bu urunde yasak (§4.9).
 *
 * @param category     saglayicinin kendi kategori kelimesi ("espresso bar"), uyum satiri icin
 * @param address      TAM kisa adres ("Kleine Berg 16, Eindhoven") — Karar ekraninin YER ekseni
 * @param locality     YALNIZ kasaba/semt kelimesi ("Eindhoven", "Strijp-S") — kart meta satiri
 *                     bunu basar; orta noktanin sehrinden farkliysa anlam tasir (spec §4.9)
 * @param ratingCount  yorum sayisi — 4,3–4,7 arasi puan gurultusunu kiran sosyal kanit
 * @param hoursToday   BUGUNUN saat metni, saglayicinin verdigi bicimde; UI kisaltir
 * @param placeLink    mekanin kanonik dis baglantisi (Maps URL ya da FSQ'da site)
 * @param activityType hangi secili ilgi alanindan geldigi; saglayici yaniti atfi cozemezse
 *                     null (deste dengesinde "artik" kovasina duser, uydurulmaz)
 * @param popularity   FSQ 0-1 arasi popularite skoru; saglayici vermezse null
 * @param ratingScale  puanin olcegi (10 FSQ, 5 Google; donusturulmez)
 * @param photoRef     saglayicinin saklanabilir foto kimligi
 */
public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl,
                             String category, String address, String locality, Integer ratingCount,
                             String hoursToday, String placeLink, ActivityType activityType,
                             Double popularity, Integer ratingScale, String photoRef) {

    /** Eski imza: zenginlestirilmemis aday (testler ve OSM taban saglayicisi icin). */
    public VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                          Double rating, Integer priceLevel, String photoUrl) {
        this(provider, externalId, name, location, rating, priceLevel, photoUrl,
                null, null, null, null, null, null, null, null, null, null);
    }

    /** Normalize puan: olcekler karistirilmadan kiyaslanabilsin (spec §4.6, §11). */
    public Double normalizedRating() {
        if (rating == null || ratingScale == null || ratingScale <= 0) {
            return null;
        }
        return rating / ratingScale;
    }
}
