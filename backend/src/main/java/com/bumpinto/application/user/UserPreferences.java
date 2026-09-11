package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.List;
import java.util.UUID;

@Service
public class UserPreferences {

    /** Filtre "her sey"e donerse Kesfet listesi kisisellesmez; sinir semada da var (V21). */
    static final int MAX_INTERESTS = 5;

    /** Spec §6: TR / EN / NL. Null = tercih yok. */
    static final Set<String> LANGUAGES = Set.of("tr", "en", "nl");

    private final UserStorePort users;

    public UserPreferences(UserStorePort users) {
        this.users = users;
    }

    @Transactional
    /** Ilgi alani ONCESI imza: mevcut liste korunur. */
    public UserProfile update(UUID userId, String name, GeoPoint defaultLocation, String label,
                              ActivityType defaultActivity, String language,
                              TravelMode travelMode) {
        return update(userId, name, defaultLocation, label, defaultActivity, language, travelMode,
                null);
    }

    public UserProfile update(UUID userId, String name, GeoPoint defaultLocation, String label,
                              ActivityType defaultActivity, String language, TravelMode travelMode,
                              List<ActivityType> interests) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        if (language != null && !LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("unsupported language: " + language);
        }
        if (interests != null && interests.size() > MAX_INTERESTS) {
            throw new IllegalArgumentException("at most " + MAX_INTERESTS + " interests");
        }
        String newName = name == null ? null : Texts.displayName(name);
        return users.saveProfile(current.withPreferences(newName, defaultLocation,
                Texts.label(label), defaultActivity, language, travelMode,
                interests == null ? null : interests.stream().distinct().toList()));
    }
}
