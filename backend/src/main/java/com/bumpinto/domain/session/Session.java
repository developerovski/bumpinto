package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Session(UUID id, String slug, UUID hostId, String name, ActivityType activityType,
                      SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                      List<UUID> runoffVenueIds) {

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityType, newStatus, expiresAt,
                decidedVenueId, runoffVenueIds);
    }

    public Session decided(UUID venueId) {
        return new Session(id, slug, hostId, name, activityType, SessionStatus.DECIDED, expiresAt,
                venueId, runoffVenueIds);
    }

    public Session inRunoff(List<UUID> venueIds) {
        return new Session(id, slug, hostId, name, activityType, SessionStatus.RUNOFF, expiresAt,
                null, List.copyOf(venueIds));
    }
}
