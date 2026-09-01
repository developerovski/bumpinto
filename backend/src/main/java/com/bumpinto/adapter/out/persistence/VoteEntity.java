package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "votes")
@IdClass(VoteEntity.Key.class)
class VoteEntity {
    @Id UUID sessionId;
    @Id UUID participantId;
    UUID venueId;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant votedAt;

    static class Key implements Serializable {
        UUID sessionId;
        UUID participantId;

        Key() {
        }

        Key(UUID sessionId, UUID participantId) {
            this.sessionId = sessionId;
            this.participantId = participantId;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && sessionId.equals(k.sessionId) && participantId.equals(k.participantId);
        }

        @Override public int hashCode() {
            return sessionId.hashCode() * 31 + participantId.hashCode();
        }
    }
}
