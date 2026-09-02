package com.bumpinto.domain.session;

import java.time.Instant;

/** Liste satiri: oturum + kayit zamani + katilimci sayimlari + karar verilen mekan (varsa). */
public record SessionSummary(Session session, Instant createdAt, int participantCount,
                             int readyCount, int doneCount,
                             String decidedVenueName, String decidedVenuePhotoUrl) {

    public SessionSummary withSession(Session s) {
        return new SessionSummary(s, createdAt, participantCount, readyCount, doneCount,
                decidedVenueName, decidedVenuePhotoUrl);
    }
}
