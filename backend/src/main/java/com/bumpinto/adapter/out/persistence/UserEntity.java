package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.user.AuthProvider;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
class UserEntity {
    @Id UUID id;
    String email;
    String name;
    String appleSub;
    String appleRefreshToken;
    String authProviders = "GOOGLE";   // csv (V13)
    Instant deletedAt;
    Instant purgeAfter;
    boolean consentLocation;
    boolean consentMicrophone;
    boolean consentAnalytics;
    Instant consentsUpdatedAt;
    int consentsVersion = 1;
    Double defaultLat;
    Double defaultLng;
    String defaultLocationLabel;
    String defaultActivity;
    String language;
    /** Kesfet filtresinin varsayilani (V21). CSV — activity_types ile ayni kalip (V8). */
    String interests;
    String defaultTravelMode;

    static UserEntity of(UUID id, String email, String name, AuthProvider provider) {
        UserEntity u = new UserEntity();
        u.id = id;
        u.email = email;
        u.name = name;
        u.authProviders = provider.name();
        return u;
    }
}
