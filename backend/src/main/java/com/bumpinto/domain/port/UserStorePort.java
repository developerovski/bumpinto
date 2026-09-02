package com.bumpinto.domain.port;

import com.bumpinto.domain.user.UserProfile;
import java.util.Optional;
import java.util.UUID;

public interface UserStorePort {
    UUID upsertByEmail(String email, String name);
    Optional<UserProfile> profileOf(UUID userId);
    UserProfile saveProfile(UserProfile profile);
}
