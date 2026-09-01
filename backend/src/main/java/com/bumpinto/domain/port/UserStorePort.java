package com.bumpinto.domain.port;

import java.util.UUID;

public interface UserStorePort {
    UUID upsertByEmail(String email, String name);
}
