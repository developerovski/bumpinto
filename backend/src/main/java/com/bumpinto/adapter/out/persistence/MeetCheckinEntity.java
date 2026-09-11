package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * V20 `meet_checkins`. Bilesik birincil anahtar (oturum, katilimci) — "kisi basina tek cevap"
 * kurali semada durur, uygulamada bir kontrol degil.
 */
@Entity
@Table(name = "meet_checkins")
class MeetCheckinEntity {

    @Embeddable
    static class Id implements Serializable {
        UUID sessionId;
        UUID participantId;

        Id() {
        }

        Id(UUID sessionId, UUID participantId) {
            this.sessionId = sessionId;
            this.participantId = participantId;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Id other && Objects.equals(sessionId, other.sessionId)
                    && Objects.equals(participantId, other.participantId);
        }

        @Override public int hashCode() {
            return Objects.hash(sessionId, participantId);
        }
    }

    @EmbeddedId Id id;
    boolean met;
    @Generated(event = EventType.INSERT) @Column(updatable = false) java.time.Instant createdAt;
}
