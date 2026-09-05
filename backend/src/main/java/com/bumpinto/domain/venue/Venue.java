package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    String mapsUrl, int deckOrder,
                    String category, String address, String locality, Integer ratingCount,
                    String hoursToday, String placeLink, ActivityType activityType) {

    /**
     * Yalnızca TESTLER için kısa imza; üretimde çağrısı yoktur (sağlayıcı alanları her zaman
     * dolar). Silinmesi denendi ve geri alındı: 5 test çağrı yerine yedişer {@code null}
     * eklemek testleri okunmaz hale getiriyordu — kazanç 7 satır, bedeli kapsamın okunurluğu.
     */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 String mapsUrl, int deckOrder) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                mapsUrl, deckOrder, null, null, null, null, null, null, null);
    }

    public Venue withDeckOrder(int newOrder) {
        return new Venue(id, sessionId, provider, externalId, name, location, rating, priceLevel,
                photoUrl, mapsUrl, newOrder, category, address, locality, ratingCount, hoursToday,
                placeLink, activityType);
    }
}
