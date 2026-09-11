package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessions")
class SessionEntity {
    @Id UUID id;
    String slug;
    UUID hostId;
    String name;
    String activityTypes; // csv
    String sessionType;
    String status;
    Instant expiresAt;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant createdAt;
    UUID decidedVenueId;
    String runoffVenueIds; // csv
    Instant decidedAt;
    String decisionKind;
    String runoffReason;
    String midpointLabel;
    Double anchorLat;
    Double anchorLng;
    /** 5 haneli davet kodu (V18); unique index sema tarafinda. */
    String joinCode;
    /**
     * Acik plan (V20). Ucu ya hep null (gizli oturum) ya hep dolu — sekil kisiti semada
     * ({@code sessions_open_plan_check}), burada tekrar edilmiyor.
     */
    Instant meetAt;
    Short capacity;
    String joinPolicy;
}
