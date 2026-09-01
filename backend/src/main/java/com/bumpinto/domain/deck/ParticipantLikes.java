package com.bumpinto.domain.deck;

import java.util.Set;
import java.util.UUID;

public record ParticipantLikes(UUID participantId, boolean deckDone, Set<UUID> likedVenueIds) {
}
