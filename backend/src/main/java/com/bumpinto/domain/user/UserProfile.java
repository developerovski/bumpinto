package com.bumpinto.domain.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import java.util.UUID;

/** Kullanicinin hesap profili + tercihleri. Tum tercih alanlari opsiyoneldir (null = ayarlanmamis). */
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language, TravelMode defaultTravelMode) {

    /** Eski imza: ulasim tercihi yok. */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language, null);
    }

    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang, TravelMode mode) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang, mode);
    }
}
