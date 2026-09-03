package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class UserStoreAdapter implements UserStorePort {

    private final UserRepository users;

    public UserStoreAdapter(UserRepository users) {
        this.users = users;
    }

    @Override public UUID upsertByEmail(String email, String name) {
        var existing = users.findByEmail(email);
        if (existing.isPresent()) {
            return withName(existing.get(), name);
        }
        try {
            // saveAndFlush: INSERT'ü burada tetikler ki unique(email) ihlali bu blokta yakalansın.
            return users.saveAndFlush(UserEntity.of(UUID.randomUUID(), email, name, "google")).id;
        } catch (DataIntegrityViolationException raceLost) {
            // Aynı e-postayla eşzamanlı ikinci login: findByEmail'i ikimiz de ıskaladık,
            // yarışı kazananın satırını oku.
            return users.findByEmail(email).map(u -> withName(u, name))
                    .orElseThrow(() -> raceLost);
        }
    }

    private UUID withName(UserEntity user, String name) {
        if (name != null && !name.equals(user.name)) {
            user.name = name;
            users.save(user);
        }
        return user.id;
    }

    @Override public Optional<UserProfile> profileOf(UUID userId) {
        return users.findById(userId).map(UserStoreAdapter::toProfile);
    }

    @Override public UserProfile saveProfile(UserProfile p) {
        UserEntity u = users.findById(p.id())
                .orElseThrow(() -> new IllegalStateException("unknown user " + p.id()));
        u.name = p.name();
        u.defaultLat = p.defaultLocation() == null ? null : p.defaultLocation().lat();
        u.defaultLng = p.defaultLocation() == null ? null : p.defaultLocation().lng();
        u.defaultLocationLabel = p.defaultLocationLabel();
        u.defaultActivity = p.defaultActivity() == null ? null : p.defaultActivity().name();
        u.language = p.language();
        u.defaultTravelMode = p.defaultTravelMode() == null ? null : p.defaultTravelMode().name();
        users.save(u);
        return toProfile(u);
    }

    static UserProfile toProfile(UserEntity u) {
        GeoPoint loc = (u.defaultLat == null || u.defaultLng == null) ? null
                : new GeoPoint(u.defaultLat, u.defaultLng);
        return new UserProfile(u.id, u.email, u.name, loc, u.defaultLocationLabel,
                u.defaultActivity == null ? null : ActivityType.valueOf(u.defaultActivity),
                u.language,
                u.defaultTravelMode == null ? null : TravelMode.valueOf(u.defaultTravelMode));
    }
}
