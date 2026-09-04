package com.bumpinto.domain.port;

import java.util.Map;
import java.util.UUID;

public record SessionEvent(String type, Map<String, Object> payload) {

    public static SessionEvent participantJoined(int count) {
        return new SessionEvent("participant_joined", Map.of("participantCount", count));
    }

    /** SOLO: host elle konumu siler; abone istemcinin listesi bayat kalmasin. */
    public static SessionEvent participantLeft(int count) {
        return new SessionEvent("participant_left", Map.of("participantCount", count));
    }

    /**
     * Biri konumunu ekledi/degistirdi. Gövde BOS: kanal kimliksiz (WebSocketConfig) ve istemci
     * zaten olayi yalnizca "tazele" zili olarak kullaniyor — sayaç koymak ek sorgu demek olurdu.
     * Yayinlanmazsa lobideki "kim hazir" sayaci yalnizca poll ile guncellenir.
     */
    public static SessionEvent locationUpdated() {
        return new SessionEvent("location_updated", Map.of());
    }

    /** Eleme oyu dustu: "kim kilitledi" listesi degisti (tally DEGIL — o zaten gizli). */
    public static SessionEvent runoffVoted(long voted, long voters) {
        return new SessionEvent("runoff_voted", Map.of("voted", voted, "voters", voters));
    }

    public static SessionEvent deckReady(int venueCount) {
        return new SessionEvent("deck_ready", Map.of("venueCount", venueCount));
    }

    /** BROWSING: deste hazir, herkes Mekanlar ekranini gorur; oylama daha basladi. */
    public static SessionEvent venuesReady(int venueCount) {
        return new SessionEvent("venues_ready", Map.of("venueCount", venueCount));
    }

    public static SessionEvent deckProgress(long done, long total) {
        return new SessionEvent("deck_progress", Map.of("done", done, "total", total));
    }

    public static SessionEvent runoffStarted(int finalistCount) {
        return new SessionEvent("runoff_started", Map.of("finalistCount", finalistCount));
    }

    /**
     * Eleme berabere bitti: karar host'un force-decision'ina gecti. Yayinlanmazsa istemciler
     * "digerlerini bekliyoruz" ekraninda kalir — oysa bekleyecek kimse kalmamistir.
     */
    public static SessionEvent runoffTie(int finalistCount) {
        return new SessionEvent("runoff_tie", Map.of("finalistCount", finalistCount));
    }

    public static SessionEvent sessionDecided(UUID venueId) {
        return new SessionEvent("session_decided", Map.of("venueId", venueId.toString()));
    }
}
