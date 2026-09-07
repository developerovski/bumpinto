package com.bumpinto.domain.safety;

import java.time.Instant;
import java.util.UUID;

/** Kayit denetim izidir; moderasyon kuyrugu sonraki iz. */
public record Report(UUID id, UUID reporterUserId, UUID sessionId, UUID targetParticipantId,
                     ReportReason reason, String note, Instant createdAt) {

    public static final int MAX_NOTE = 500;

    public Report {
        if (note != null && note.length() > MAX_NOTE) {
            throw new IllegalArgumentException("note too long");
        }
    }
}
