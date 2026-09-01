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
@Table(name = "participants")
class ParticipantEntity {
    @Id UUID id;
    UUID sessionId;
    String displayName;
    Double lat;
    Double lng;
    String token;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant joinedAt;
    Instant deckDoneAt;
    boolean isHost;
}
