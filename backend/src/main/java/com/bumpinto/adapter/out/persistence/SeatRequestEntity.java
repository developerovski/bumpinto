package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.Instant;
import java.util.UUID;

/** V20 `seat_requests`. Paket-ozel (ARCHITECTURE §9): entity'ler adaptorun disina cikmaz. */
@Entity
@Table(name = "seat_requests")
class SeatRequestEntity {
    @Id UUID id;
    UUID sessionId;
    UUID userId;
    String displayName;
    Double lat;
    Double lng;
    String locationLabel;
    String travelMode;
    String note;
    String status;
    /** DB `default now()`; uygulama saati yazmaz — sira DB'nin saatine gore kurulur. */
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant createdAt;
    Instant decidedAt;
}
