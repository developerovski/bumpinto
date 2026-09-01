package com.bumpinto.adapter.in.web;

import com.bumpinto.application.DeckFlow;
import com.bumpinto.infra.ParticipantPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    DeckController(DeckFlow deckFlow) {
        this.deckFlow = deckFlow;
    }

    @PostMapping("/swipes")
    void swipe(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
               @Valid @RequestBody ApiDtos.SwipeRequest request) {
        deckFlow.swipe(slug, WebPrincipals.participantId(me), request.venueId(), request.liked());
    }

    @DeleteMapping("/swipes/{venueId}")
    void undo(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
              @PathVariable UUID venueId) {
        deckFlow.undoSwipe(slug, WebPrincipals.participantId(me), venueId);
    }

    @PostMapping("/deck-done")
    void deckDone(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug) {
        deckFlow.finishDeck(slug, WebPrincipals.participantId(me));
    }

    @PostMapping("/runoff-votes")
    void runoffVote(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
                    @Valid @RequestBody ApiDtos.RunoffVoteRequest request) {
        deckFlow.runoffVote(slug, WebPrincipals.participantId(me), request.venueId());
    }
}
