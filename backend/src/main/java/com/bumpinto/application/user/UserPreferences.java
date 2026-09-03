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
import java.util.UUID;

@Service
public class UserPreferences {

    /** Spec §6: TR / EN / NL. Null = tercih yok. */
    static final Set<String> LANGUAGES = Set.of("tr", "en", "nl");

    private final UserStorePort users;

    public UserPreferences(UserStorePort users) {
        this.users = users;
    }

    @Transactional
    public UserProfile update(UUID userId, String name, GeoPoint defaultLocation, String label,
                              ActivityType defaultActivity, String language, TravelMode travelMode) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        if (language != null && !LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("unsupported language: " + language);
        }
        String newName = name == null ? null : Texts.displayName(name);
        return users.saveProfile(current.withPreferences(newName, defaultLocation,
                Texts.label(label), defaultActivity, language, travelMode));
    }
}
