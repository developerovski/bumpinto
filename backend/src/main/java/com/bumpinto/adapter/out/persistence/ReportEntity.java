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
@Table(name = "reports")
class ReportEntity {
    @Id UUID id;
    /** Raporu yazan hesap silinince NULL olur (V15 on delete set null): moderasyon izi kalir. */
    UUID reporterUserId;
    UUID sessionId;
    UUID targetParticipantId;
    String reason;
    String note;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant createdAt;
}
