package com.bumpinto.domain.safety;

import java.time.Instant;
import java.util.UUID;

/**
 * Engel iki turlu (§2): hesap duzeyinde KALICI, anonim katilimci icin YALNIZ o oturum.
 * Ikisi birden ya da hicbiri gecersizdir — yarim hedef sessizce hicbir seyi engellemez.
 */
public record Block(UUID id, UUID blockerUserId, UUID blockedUserId, UUID blockedParticipantId,
                    UUID sessionId, Instant createdAt) {

    public Block {
        boolean account = blockedUserId != null;
        boolean participant = blockedParticipantId != null;
        if (account == participant) {
            throw new IllegalArgumentException("exactly one of blockedUserId/blockedParticipantId");
        }
        if (participant && sessionId == null) {
            throw new IllegalArgumentException("participant block requires sessionId");
        }
        if (account && (sessionId != null || blockedUserId.equals(blockerUserId))) {
            throw new IllegalArgumentException("invalid account block");
        }
    }

    public static Block ofUser(UUID id, UUID blockerUserId, UUID blockedUserId, Instant createdAt) {
        return new Block(id, blockerUserId, blockedUserId, null, null, createdAt);
    }

    public static Block ofParticipant(UUID id, UUID blockerUserId, UUID blockedParticipantId,
                                      UUID sessionId, Instant createdAt) {
        return new Block(id, blockerUserId, null, blockedParticipantId, sessionId, createdAt);
    }

    public boolean accountBlock() {
        return blockedUserId != null;
    }
}
