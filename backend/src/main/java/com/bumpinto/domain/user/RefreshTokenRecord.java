package com.bumpinto.domain.user;

import java.time.Instant;
import java.util.UUID;

/**
 * Yenileme jetonunun SAKLANAN hali. Jetonun kendisi burada YOKTUR — yalniz SHA-256 ozeti;
 * degeri yalnizca uretildigi an istemciye gider ve bir daha okunamaz.
 */
public record RefreshTokenRecord(UUID id, UUID userId, String tokenHash, UUID familyId,
                                 UUID rotatedFrom, String client, Instant issuedAt,
                                 Instant expiresAt, Instant revokedAt) {

    public boolean revoked() {
        return revokedAt != null;
    }

    /** Sinirda (expiresAt == now) DOLMUS sayilir: kenar durumda comert davranmayiz. */
    public boolean expired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
