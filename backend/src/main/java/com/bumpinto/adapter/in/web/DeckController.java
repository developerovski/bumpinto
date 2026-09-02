package com.bumpinto.adapter.in.web;

import com.bumpinto.application.deck.DeckFlow;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{slug}")
class DeckController {

    private final DeckFlow deckFlow;
    private final ParticipantIdentity me;

    DeckController(DeckFlow deckFlow, ParticipantIdentity me) {
        this.deckFlow = deckFlow;
        this.me = me;
    }

    @PostMapping("/swipes")
    void swipe(Authentication auth, @PathVariable String slug,
               @Valid @RequestBody ApiDtos.SwipeRequest request) {
        deckFlow.swipe(slug, me.of(auth, slug), request.venueId(), request.liked());
    }

    @DeleteMapping("/swipes/{venueId}")
    void undo(Authentication auth, @PathVariable String slug, @PathVariable UUID venueId) {
        deckFlow.undoSwipe(slug, me.of(auth, slug), venueId);
    }

    @PostMapping("/deck-done")
    void deckDone(Authentication auth, @PathVariable String slug) {
        deckFlow.finishDeck(slug, me.of(auth, slug));
    }

    @PostMapping("/runoff-votes")
    void runoffVote(Authentication auth, @PathVariable String slug,
                    @Valid @RequestBody ApiDtos.RunoffVoteRequest request) {
        deckFlow.runoffVote(slug, me.of(auth, slug), request.venueId());
    }
}
