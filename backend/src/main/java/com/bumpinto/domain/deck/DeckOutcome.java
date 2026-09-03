package com.bumpinto.domain.deck;

import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;

import java.util.List;
import java.util.UUID;

public sealed interface DeckOutcome {

    /** kind: UNANIMOUS (kesisimde tek mekan) ya da SINGLE_LIKE (toplamda tek begeni). */
    record Decided(UUID venueId, DecisionKind kind) implements DeckOutcome {
    }

    record Runoff(List<UUID> venueIds, RunoffReason reason) implements DeckOutcome {
    }

    record NoLikes() implements DeckOutcome {
    }
}
