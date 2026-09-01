package com.bumpinto.domain.deck;

import java.util.List;
import java.util.UUID;

public sealed interface DeckOutcome {

    record Decided(UUID venueId) implements DeckOutcome {
    }

    record Runoff(List<UUID> venueIds) implements DeckOutcome {
    }

    record NoLikes() implements DeckOutcome {
    }
}
