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
                      GeoPoint anchor,
                      /** 5 haneli davet kodu (R-B9); eski satirlarda ve backfill disinda null. */
                      String joinCode,
                      /**
                       * Acik plan (B-17); null ise oturum GIZLIDIR — Kesfet'te listelenmez ve
                       * bugunku davet-linkli davranis aynen surer. Bayrak alani yok, varligin
                       * kendisi bayraktir.
                       */
                      OpenPlan openPlan,
                      /**
                       * Kesfet'in HERKESE ACIK, KABA yer adi (B-18, K-B38): capa noktasinin ya da
                       * host konumunun semti. {@code midpointLabel}in aksine host'un yazdigi etiket
                       * DEGILDIR — o etiket uyelere ozeldir. Gizli oturumda null.
                       */
                      String locality) {

    /** Listeler KOPYALANIR: cagiranin elindeki liste sonradan degisse oturum bozulmaz. */
    public Session {
        activityTypes = List.copyOf(activityTypes);
        runoffVenueIds = List.copyOf(runoffVenueIds);
    }

    /** Semt ONCESI imza (B-17 cagri yerleri kirilmaz): locality null. */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes, SessionType sessionType,
                   SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                   List<UUID> runoffVenueIds, Instant decidedAt, DecisionKind decisionKind,
                   RunoffReason runoffReason, String midpointLabel, GeoPoint anchor,
                   String joinCode, OpenPlan openPlan) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor, joinCode, openPlan, null);
    }

    /**
     * Acik plan ONCESI imza (B-16 ve oncesi cagri yerleri kirilmaz): uretilen oturum GIZLIDIR.
     * Alan eklendi diye bugunku cagri yerlerinin anlami degismez.
     */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes, SessionType sessionType,
                   SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                   List<UUID> runoffVenueIds, Instant decidedAt, DecisionKind decisionKind,
                   RunoffReason runoffReason, String midpointLabel, GeoPoint anchor,
                   String joinCode) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor, joinCode, null);
    }

    /** Kod ONCESI imza (B-14 ve oncesi cagri yerleri kirilmaz). */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes, SessionType sessionType,
                   SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                   List<UUID> runoffVenueIds, Instant decidedAt, DecisionKind decisionKind,
                   RunoffReason runoffReason, String midpointLabel, GeoPoint anchor) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor, null);
    }

    /** Eski imza: karar meta'si, merkez etiketi ve capa henuz yok. */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes,
                   SessionType sessionType, SessionStatus status, Instant expiresAt,
                   UUID decidedVenueId, List<UUID> runoffVenueIds) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt, decidedVenueId,
                runoffVenueIds, null, null, null, null, null, null);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isSolo() {
        return sessionType == SessionType.SOLO;
    }

    /** Kesfet'te listelenir mi. Bayrak sutunu YOK: acik plan kaydinin varligi bayraktir. */
    public boolean isOpenPlan() {
        return openPlan != null;
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, newStatus,
                expiresAt, decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor, joinCode, openPlan, locality);
    }

    public Session withMidpointLabel(String label) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, label,
                anchor, joinCode, openPlan, locality);
    }

    /** runoffReason KORUNUR: "runoff'tan cikan karar" izini karar sonrasi da anlatir. */
    public Session decided(UUID venueId, DecisionKind kind, Instant when) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(when, "when");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.DECIDED, expiresAt, venueId, runoffVenueIds, when, kind,
                runoffReason, midpointLabel, anchor, joinCode, openPlan, locality);
    }

    public Session inRunoff(List<UUID> venueIds, RunoffReason reason) {
        Objects.requireNonNull(reason, "reason");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.RUNOFF, expiresAt, null, List.copyOf(venueIds), null, null, reason,
                midpointLabel, anchor, joinCode, openPlan, locality);
    }
}
