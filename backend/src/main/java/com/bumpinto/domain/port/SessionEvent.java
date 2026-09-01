package com.bumpinto.domain.port;

import java.util.Map;
import java.util.UUID;

public record SessionEvent(String type, Map<String, Object> payload) {

    public static SessionEvent participantJoined(int count) {
        return new SessionEvent("participant_joined", Map.of("participantCount", count));
    }

    public static SessionEvent deckReady(int venueCount) {
        return new SessionEvent("deck_ready", Map.of("venueCount", venueCount));
    }

    public static SessionEvent deckProgress(long done, long total) {
        return new SessionEvent("deck_progress", Map.of("done", done, "total", total));
    }

    public static SessionEvent runoffStarted(int finalistCount) {
        return new SessionEvent("runoff_started", Map.of("finalistCount", finalistCount));
    }

    public static SessionEvent sessionDecided(UUID venueId) {
        return new SessionEvent("session_decided", Map.of("venueId", venueId.toString()));
    }
}
