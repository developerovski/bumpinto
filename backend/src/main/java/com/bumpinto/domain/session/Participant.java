package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.time.Instant;
import java.util.UUID;

/**
 * manual=true: host'un elle ekledigi konum (SOLO). Token'i YOK, kaydirmaz, oy popülasyonuna
 * girmez; yalniz orta nokta / yaricap / deste geometrisine dahildir.
 *
 * <p>travelMode: spec §4.5b. Varsayilan CAR — elle konumlar ve gec katilanlar da CAR sayilir.
 */
public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt,
                          boolean manual, String locationLabel, TravelMode travelMode) {

    public Participant {
        if (travelMode == null) {
            travelMode = TravelMode.CAR;
        }
    }

    /** Eski imza: mod verilmeyen her yer CAR'dir. */
    public Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                       boolean host, String token, Instant deckDoneAt,
                       boolean manual, String locationLabel) {
        this(id, sessionId, displayName, location, host, token, deckDoneAt, manual, locationLabel,
                TravelMode.CAR);
    }

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
        return locatedAt(newLocation, newLabel, travelMode);
    }

    public Participant locatedAt(GeoPoint newLocation, String newLabel, TravelMode newMode) {
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt,
                manual, newLabel, newMode == null ? travelMode : newMode);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when,
                manual, locationLabel, travelMode);
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
                + ", locationLabel=" + locationLabel + ", travelMode=" + travelMode + "]";
    }
}
