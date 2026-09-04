package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.Participant;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{slug}")
class ParticipantController {

    private final SessionCommands commands;
    private final ParticipantTokenDelivery tokens;
    private final ParticipantIdentity me;

    ParticipantController(SessionCommands commands, ParticipantTokenDelivery tokens,
            ParticipantIdentity me) {
        this.commands = commands;
        this.tokens = tokens;
        this.me = me;
    }

    /**
     * Kimlik ZORUNLU degil (davet linki anonim katilima aciktir) ama varsa kullanilir: koltugu
     * ya da hesabi olan cagiran ayni oturumda ikinci koltuk acmaz (bkz. SessionCommands#join).
     */
    @PostMapping("/participants")
    ResponseEntity<ApiDtos.JoinResponse> join(@PathVariable String slug, Authentication auth,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client,
            @Valid @RequestBody ApiDtos.JoinRequest request) {
        GeoPoint location = request.lat() == null || request.lng() == null ? null
                : new GeoPoint(request.lat(), request.lng());
        SessionCommands.JoinResult joined = commands.join(slug, WebPrincipals.callerOf(auth),
                request.displayName(), location,
                request.locationLabel(), request.travelMode());
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        String bodyToken = tokens.deliver(response, client, joined.session(), joined.participant());
        return response.body(new ApiDtos.JoinResponse(joined.participant().id(), bodyToken));
    }

    @PutMapping("/location")
    void location(Authentication auth, @PathVariable String slug,
            @Valid @RequestBody ApiDtos.LocationRequest request) {
        commands.updateLocation(slug, me.of(auth, slug),
                new GeoPoint(request.lat(), request.lng()), request.label(), request.travelMode());
    }
}
