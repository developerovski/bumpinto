package com.bumpinto.adapter.in.web;

import com.bumpinto.application.DeckFlow;
import com.bumpinto.application.SessionCommands;
import com.bumpinto.application.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
class SessionController {

    private final SessionCommands commands;
    private final DeckFlow deckFlow;
    private final SessionQueries queries;
    private final SessionViewAssembler assembler;
    private final ParticipantTokenDelivery tokens;

    SessionController(SessionCommands commands, DeckFlow deckFlow, SessionQueries queries,
                      SessionViewAssembler assembler, ParticipantTokenDelivery tokens) {
        this.commands = commands;
        this.deckFlow = deckFlow;
        this.queries = queries;
        this.assembler = assembler;
        this.tokens = tokens;
    }

    @PostMapping
    ResponseEntity<ApiDtos.CreateSessionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client,
            @Valid @RequestBody ApiDtos.CreateSessionRequest request) {
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.hostUserId(jwt), request.name(), request.activityType(),
                new GeoPoint(request.lat(), request.lng()), request.displayName());
        // Host da bir katılımcıdır: token'ı katılımdaki kuralın AYNISIYLA teslim edilir.
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        String bodyToken = tokens.deliver(response, client, result.session().slug(),
                result.hostParticipant().token());
        return response.body(new ApiDtos.CreateSessionResponse(result.session().slug(),
                result.session().id(), result.hostParticipant().id(), bodyToken,
                result.session().expiresAt()));
    }

    @GetMapping("/{slug}")
    ApiDtos.SessionView view(@PathVariable String slug) {
        return assembler.toView(queries.snapshot(slug));
    }

    @PostMapping("/{slug}/find-venues")
    ApiDtos.SessionView findVenues(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug) {
        deckFlow.findVenues(slug, WebPrincipals.hostUserId(jwt));
        return assembler.toView(queries.snapshot(slug));
    }

    @PostMapping("/{slug}/force-decision")
    ApiDtos.SessionView forceDecision(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
            @RequestBody(required = false) ApiDtos.ForceDecisionRequest request) {
        deckFlow.forceDecision(slug, WebPrincipals.hostUserId(jwt),
                request == null ? null : request.venueId());
        return assembler.toView(queries.snapshot(slug));
    }
}
