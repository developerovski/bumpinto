package com.bumpinto.domain.port;

import com.bumpinto.domain.venue.Venue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface DeckStorePort {
    List<Venue> saveVenues(List<Venue> venues);
    List<Venue> venuesOf(UUID sessionId);
    /** deckOrder'i verilen sirayla 0..n-1 olarak yeniden yazar. Liste oturumun TUM mekanlarini icermeli. */
    void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds);
    void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked);
    void deleteSwipe(UUID venueId, UUID participantId);
    Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId);
    void castVote(UUID sessionId, UUID venueId, UUID participantId);
    Map<UUID, Long> voteTally(UUID sessionId);
    long votersCount(UUID sessionId);
    /** Runoff'ta kim oy verdi (neyi seçtiği değil) — W7 "kim kilitledi" rozeti. */
    Set<UUID> voters(UUID sessionId);
}
