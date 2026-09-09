package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity {
    @Id UUID id;
    UUID userId;
    String tokenHash;
    UUID familyId;
    UUID rotatedFrom;
    String client;
    Instant issuedAt;
    Instant expiresAt;
    Instant revokedAt;
}
