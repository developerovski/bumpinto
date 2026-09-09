package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.RefreshTokenStorePort;
import com.bumpinto.domain.user.RefreshTokenRecord;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class RefreshTokenStoreAdapter implements RefreshTokenStorePort {

    private final RefreshTokenRepository tokens;

    public RefreshTokenStoreAdapter(RefreshTokenRepository tokens) {
        this.tokens = tokens;
    }

    @Override
    public void save(RefreshTokenRecord token) {
        RefreshTokenEntity e = new RefreshTokenEntity();
        e.id = token.id();
        e.userId = token.userId();
        e.tokenHash = token.tokenHash();
        e.familyId = token.familyId();
        e.rotatedFrom = token.rotatedFrom();
        e.client = token.client();
        e.issuedAt = token.issuedAt();
        e.expiresAt = token.expiresAt();
        e.revokedAt = token.revokedAt();
        tokens.save(e);
    }

    @Override
    public Optional<RefreshTokenRecord> findByHash(String tokenHash) {
        return tokens.findByTokenHash(tokenHash).map(RefreshTokenStoreAdapter::toRecord);
    }

    @Override
    @Transactional
    public void revoke(UUID id, Instant at) {
        tokens.findById(id).ifPresent(e -> {
            // Ilk iptal damgasi KORUNUR: ikinci cagri "ne zaman kapandi" bilgisini ezmemeli.
            if (e.revokedAt == null) {
                e.revokedAt = at;
                tokens.save(e);
            }
        });
    }

    @Override
    @Transactional
    public int revokeFamily(UUID familyId, Instant at) {
        return tokens.revokeFamily(familyId, at);
    }

    @Override
    @Transactional
    public int revokeAllOfUser(UUID userId, Instant at) {
        return tokens.revokeAllOfUser(userId, at);
    }

    private static RefreshTokenRecord toRecord(RefreshTokenEntity e) {
        return new RefreshTokenRecord(e.id, e.userId, e.tokenHash, e.familyId, e.rotatedFrom,
                e.client, e.issuedAt, e.expiresAt, e.revokedAt);
    }
}
