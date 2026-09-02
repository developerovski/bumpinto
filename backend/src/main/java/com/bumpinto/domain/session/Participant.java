package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;

import java.time.Instant;
import java.util.UUID;

/**
 * manual=true: host'un elle ekledigi konum (SOLO). Token'i YOK, kaydirmaz, oy popülasyonuna
 * girmez; yalniz orta nokta / yaricap / deste geometrisine dahildir.
 */
public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt,
                          boolean manual, String locationLabel) {

    public boolean hasLocation() {
        return location != null;
    }

    public boolean deckDone() {
        return deckDoneAt != null;
    }

    /** Oy popülasyonu: konumu olan ve elle eklenmemis katilimci. */
    public boolean votes() {
        return hasLocation() && !manual;
    }

    public Participant locatedAt(GeoPoint newLocation, String newLabel) {
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt,
                manual, newLabel);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when,
                manual, locationLabel);
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
                + ", deckDoneAt=" + deckDoneAt + ", manual=" + manual
                + ", locationLabel=" + locationLabel + "]";
    }
}
