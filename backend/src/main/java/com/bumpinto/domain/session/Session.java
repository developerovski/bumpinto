package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record Session(UUID id, String slug, UUID hostId, String name,
                      List<ActivityType> activityTypes,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds,
                      /** Karar ani; DECIDED disinda null. */
                      Instant decidedAt, DecisionKind decisionKind, RunoffReason runoffReason,
                      /** Merkezin adi; capasizsa find-venues'te, capaliysa olusturmada yazilir. */
                      String midpointLabel,
                      /** Host'un sabit bulusma noktasi; null ise orta nokta modu. */
                      GeoPoint anchor) {

    /** Listeler KOPYALANIR: cagiranin elindeki liste sonradan degisse oturum bozulmaz. */
    public Session {
        activityTypes = List.copyOf(activityTypes);
        runoffVenueIds = List.copyOf(runoffVenueIds);
    }

    /** Eski imza: karar meta'si, merkez etiketi ve capa henuz yok. */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes,
                   SessionType sessionType, SessionStatus status, Instant expiresAt,
                   UUID decidedVenueId, List<UUID> runoffVenueIds) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt, decidedVenueId,
                runoffVenueIds, null, null, null, null, null);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isSolo() {
        return sessionType == SessionType.SOLO;
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, newStatus,
                expiresAt, decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor);
    }

    public Session withMidpointLabel(String label) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, label,
                anchor);
    }

    /** runoffReason KORUNUR: "runoff'tan cikan karar" izini karar sonrasi da anlatir. */
    public Session decided(UUID venueId, DecisionKind kind, Instant when) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(when, "when");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.DECIDED, expiresAt, venueId, runoffVenueIds, when, kind,
                runoffReason, midpointLabel, anchor);
    }

    public Session inRunoff(List<UUID> venueIds, RunoffReason reason) {
        Objects.requireNonNull(reason, "reason");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.RUNOFF, expiresAt, null, List.copyOf(venueIds), null, null, reason,
                midpointLabel, anchor);
    }
}
