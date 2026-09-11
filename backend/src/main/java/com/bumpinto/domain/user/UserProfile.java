package com.bumpinto.domain.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Kullanicinin hesap profili + tercihleri. Tum tercih alanlari opsiyoneldir (null = ayarlanmamis). */
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language, TravelMode defaultTravelMode,
                          Set<AuthProvider> authProviders, Consents consents,
                          /** Kesfet'in varsayilan filtresi (B-17); en cok 5 tur, bos = filtresiz. */
                          List<ActivityType> interests) {

    public UserProfile {
        authProviders = authProviders == null || authProviders.isEmpty()
                ? Set.of(AuthProvider.GOOGLE)
                : Collections.unmodifiableSet(EnumSet.copyOf(authProviders));
        consents = consents == null ? Consents.none() : consents;
        interests = interests == null ? List.of() : List.copyOf(interests);
    }

    /** Ilgi alani ONCESI imza (B-16 ve oncesi cagri yerleri kirilmaz). */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language,
                       TravelMode defaultTravelMode, Set<AuthProvider> authProviders,
                       Consents consents) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language,
                defaultTravelMode, authProviders, consents, null);
    }

    /** Eski 8'li imza: saglayici/riza bilinmiyor -> GOOGLE + riza yok. */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language,
                       TravelMode defaultTravelMode) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language,
                defaultTravelMode, null, null);
    }

    /** Eski 7'li imza: ulasim tercihi de yok. */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language, null);
    }

    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang, TravelMode mode) {
        return withPreferences(newName, location, label, activity, lang, mode, interests);
    }

    /** Tam degistirme (B-17): `interests` null ise MEVCUT liste korunur, bos liste temizler. */
    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang, TravelMode mode,
                                       List<ActivityType> newInterests) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang, mode, authProviders, consents,
                newInterests == null ? interests : newInterests);
    }

    public UserProfile withConsents(Consents newConsents) {
        return new UserProfile(id, email, name, defaultLocation, defaultLocationLabel,
                defaultActivity, language, defaultTravelMode, authProviders, newConsents,
                interests);
    }
}
