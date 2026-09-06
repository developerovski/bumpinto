package com.bumpinto.domain.voice;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Bir oturumun ses odasi. Uyelik = kisinin kendi sinyal konusuna aboneligi (spec K4);
 * satir DEGIL, canli bir koltuk. Surec icinde yasar, DB'ye yazilmaz (K8).
 */
public record VoiceRoom(UUID sessionId, String slug, Instant startedAt, Instant endsAt,
                        Map<UUID, Seat> members) {

    public VoiceRoom {
        members = Map.copyOf(members);
    }

    /** Sirasiz. */
    public Set<UUID> memberIds() {
        return members.keySet();
    }

    public boolean hasMember(UUID participantId) {
        return members.containsKey(participantId);
    }

    /** Bitise kalan sure; gecmisse sifir. TURN kimlik omru bundan turetilir (K7). */
    public Duration remaining(Instant now) {
        Duration left = Duration.between(now, endsAt);
        return left.isNegative() ? Duration.ZERO : left;
    }
}
