package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "blocks")
class BlockEntity {
    @Id UUID id;
    UUID blockerUserId;
    UUID blockedUserId;
    UUID blockedParticipantId;
    UUID sessionId;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant createdAt;
}
