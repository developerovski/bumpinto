package com.bumpinto.domain.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import java.util.UUID;

/** Kullanicinin hesap profili + tercihleri. Tum tercih alanlari opsiyoneldir (null = ayarlanmamis). */
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language) {

    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang);
    }
}
