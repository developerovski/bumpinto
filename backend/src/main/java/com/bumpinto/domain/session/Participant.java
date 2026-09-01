package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;

import java.time.Instant;
import java.util.UUID;

public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt) {

    public boolean hasLocation() {
        return location != null;
    }

    public boolean deckDone() {
        return deckDoneAt != null;
    }

    public Participant locatedAt(GeoPoint newLocation) {
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when);
    }

    /**
     * token bir sirdir: default record toString'i onu log'a ve hata mesajina sizdirir
     * (bir gun biri log.debug("p={}", participant) yazar). Saf Java — domain saf kalir.
     */
    @Override
    public String toString() {
        return "Participant[id=" + id + ", sessionId=" + sessionId
                + ", displayName=" + displayName + ", location=" + location
                + ", host=" + host + ", token=" + (token == null ? "null" : "***")
                + ", deckDoneAt=" + deckDoneAt + "]";
    }
}
