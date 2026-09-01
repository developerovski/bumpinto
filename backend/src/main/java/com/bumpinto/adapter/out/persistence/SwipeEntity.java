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
@Table(name = "swipes")
@IdClass(SwipeEntity.Key.class)
class SwipeEntity {
    @Id UUID venueId;
    @Id UUID participantId;
    UUID sessionId;
    boolean liked;
    @Generated(event = EventType.INSERT) @Column(updatable = false) Instant swipedAt;

    static class Key implements Serializable {
        UUID venueId;
        UUID participantId;

        Key() {
        }

        Key(UUID venueId, UUID participantId) {
            this.venueId = venueId;
            this.participantId = participantId;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && venueId.equals(k.venueId) && participantId.equals(k.participantId);
        }

        @Override public int hashCode() {
            return venueId.hashCode() * 31 + participantId.hashCode();
        }
    }
}
