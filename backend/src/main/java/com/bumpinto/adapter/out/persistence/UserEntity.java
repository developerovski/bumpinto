package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "users")
class UserEntity {
    @Id UUID id;
    String email;
    String name;
    String authProvider;
    Double defaultLat;
    Double defaultLng;
    String defaultLocationLabel;
    String defaultActivity;
    String language;

    static UserEntity of(UUID id, String email, String name, String provider) {
        UserEntity u = new UserEntity();
        u.id = id;
        u.email = email;
        u.name = name;
        u.authProvider = provider;
        return u;
    }
}
