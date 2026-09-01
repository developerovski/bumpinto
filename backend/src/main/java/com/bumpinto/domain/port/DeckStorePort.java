package com.bumpinto.domain.port;

import com.bumpinto.domain.venue.Venue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface DeckStorePort {
    List<Venue> saveVenues(List<Venue> venues);
    List<Venue> venuesOf(UUID sessionId);
    void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked);
    void deleteSwipe(UUID venueId, UUID participantId);
    Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId);
    void castVote(UUID sessionId, UUID venueId, UUID participantId);
    Map<UUID, Long> voteTally(UUID sessionId);
    long votersCount(UUID sessionId);
}
