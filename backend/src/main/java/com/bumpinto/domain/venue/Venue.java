package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    int deckOrder,
                    String category, String address, String locality, Integer ratingCount,
                    String hoursToday, String placeLink, ActivityType activityType,
                    Double popularity, Integer ratingScale, String photoRef,
                    /** "Neyle bilinir" tek satiri (R-B7); veri yoksa null. */
                    String tagline, TaglineSource taglineSource) {

    /** Tagline'siz zenginlestirilmis mekan (B-13 imzasi; cagri yerleri kirilmaz). */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 int deckOrder, String category, String address, String locality,
                 Integer ratingCount, String hoursToday, String placeLink,
                 ActivityType activityType, Double popularity, Integer ratingScale,
                 String photoRef) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                deckOrder, category, address, locality, ratingCount, hoursToday, placeLink,
                activityType, popularity, ratingScale, photoRef, null, null);
    }

    /**
     * Yalnızca TESTLER için kısa imza; üretimde çağrısı yoktur (sağlayıcı alanları her zaman
     * dolar). Silinmesi denendi ve geri alındı: 5 test çağrı yerine yedişer {@code null}
     * eklemek testleri okunmaz hale getiriyordu — kazanç 7 satır, bedeli kapsamın okunurluğu.
     */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 int deckOrder) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                deckOrder, null, null, null, null, null, null, null, null, null, null);
    }

    /** Normalize puan: olcekler karistirilmadan kiyaslanabilsin (spec §4.6, §11). */
    public Double normalizedRating() {
        if (rating == null || ratingScale == null || ratingScale <= 0) {
            return null;
        }
        return rating / ratingScale;
    }

    public Venue withDeckOrder(int newOrder) {
        return new Venue(id, sessionId, provider, externalId, name, location, rating, priceLevel,
                photoUrl, newOrder, category, address, locality, ratingCount, hoursToday,
                placeLink, activityType, popularity, ratingScale, photoRef, tagline,
                taglineSource);
    }
}
