package com.bumpinto.adapter.in.web;

import com.bumpinto.application.deck.DeckFlow;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.SessionType;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final UserProfileQueries profiles;

    SessionController(SessionCommands commands, DeckFlow deckFlow, SessionQueries queries,
                      SessionViewAssembler assembler, ParticipantTokenDelivery tokens,
                      UserProfileQueries profiles) {
        this.commands = commands;
        this.deckFlow = deckFlow;
        this.queries = queries;
        this.assembler = assembler;
        this.tokens = tokens;
        this.profiles = profiles;
    }

    @GetMapping
    ApiDtos.SessionListResponse mine(@AuthenticationPrincipal Jwt jwt) {
        return assembler.toList(profiles.mySessions(WebPrincipals.hostUserId(jwt)));
    }

    @PostMapping
    ResponseEntity<ApiDtos.CreateSessionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client,
            @Valid @RequestBody ApiDtos.CreateSessionRequest request) {
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.hostUserId(jwt), request.name(), request.activityType(),
                request.sessionType() == null ? SessionType.GROUP : request.sessionType(),
                new GeoPoint(request.lat(), request.lng()), request.displayName(),
                request.locationLabel(), request.travelMode());
        // Host da bir katılımcıdır: token'ı katılımdaki kuralın AYNISIYLA teslim edilir.
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        String bodyToken = tokens.deliver(response, client, result.session(),
                result.hostParticipant());
        return response.body(new ApiDtos.CreateSessionResponse(result.session().slug(),
                result.session().id(), result.hostParticipant().id(), bodyToken,
                result.session().expiresAt()));
    }

    /**
     * Oturumun İÇİ yalnızca ÜYESİNE açıktır. Kimlik doğrulanmış olmak yetmez: önceden bu uç
     * her oturum açmış hesaba 200 + {@code viewer:null} dönüyordu, yani slug'ı ele geçiren
     * herhangi bir hesap katılmadan katılımcı listesini ve yaklaşık konumları okuyabiliyordu.
     * Katılmamış birine açık olan tek şey public önizlemedir ({@code /preview}) — koordinat,
     * katılımcı id'si ve mekân taşımaz.
     *
     * <p>Host'u dışarıda bırakmaz: katılımcı çerezi olmayan bir tarayıcıda bile hesap JWT'si
     * host katılımcısına çözülür ({@link WebPrincipals#viewerOf}).
     */
    @GetMapping("/{slug}")
    ApiDtos.SessionView view(@PathVariable String slug, Authentication auth) {
        SessionQueries.SessionSnapshot snapshot = queries.snapshot(slug);
        if (WebPrincipals.viewerOf(snapshot, auth) == null) {
            // Görünüm ÜRETİLMEDEN reddedilir: aksi halde üye olmayan her istek boşuna tam
            // assemble (mekân başına yol süresi hesabı) yaptırırdı.
            throw new ForbiddenException("not a participant of this session");
        }
        return assembler.toView(snapshot, auth);
    }

    @GetMapping("/{slug}/preview")
    ApiDtos.SessionPreview preview(@PathVariable String slug) {
        return assembler.toPreview(queries.snapshot(slug));
    }

    @PostMapping("/{slug}/find-venues")
    ApiDtos.SessionView findVenues(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
            Authentication auth) {
        deckFlow.findVenues(slug, WebPrincipals.hostUserId(jwt));
        return assembler.toView(queries.snapshot(slug), auth);
    }

    @PostMapping("/{slug}/shuffle")
    ApiDtos.SessionView shuffle(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
            Authentication auth) {
        deckFlow.shuffle(slug, WebPrincipals.hostUserId(jwt));
        return assembler.toView(queries.snapshot(slug), auth);
    }

    @PostMapping("/{slug}/force-decision")
    ApiDtos.SessionView forceDecision(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
            @RequestBody(required = false) ApiDtos.ForceDecisionRequest request, Authentication auth) {
        deckFlow.forceDecision(slug, WebPrincipals.hostUserId(jwt),
                request == null ? null : request.venueId());
        return assembler.toView(queries.snapshot(slug), auth);
    }
}
