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
    String activityType;
    String sessionType;
    String status;
    Instant expiresAt;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant createdAt;
    UUID decidedVenueId;
    String runoffVenueIds; // csv
}
