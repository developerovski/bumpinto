package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.infra.security.ParticipantPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** SOLO oturumda host'un elle ekledigi konumlar. Host'un KATILIMCI kimligi gerekir. */
@RestController
@RequestMapping("/api/sessions/{slug}/points")
class PointsController {

    private final SessionCommands commands;

    PointsController(SessionCommands commands) {
        this.commands = commands;
    }

    @PostMapping
    ResponseEntity<ApiDtos.ParticipantDto> add(@AuthenticationPrincipal ParticipantPrincipal me,
            @PathVariable String slug, @Valid @RequestBody ApiDtos.PointRequest request) {
        Participant point = commands.addPoint(slug, WebPrincipals.participantId(me),
                request.displayName(), request.locationLabel(),
                new GeoPoint(request.lat(), request.lng()), request.travelMode());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiDtos.ParticipantDto(
                point.id(), point.displayName(), false, true, false, true, point.locationLabel(),
                SessionViewAssembler.approx(point.location()), point.travelMode(), null));
    }

    @DeleteMapping("/{participantId}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal ParticipantPrincipal me,
                                @PathVariable String slug, @PathVariable UUID participantId) {
        commands.removePoint(slug, WebPrincipals.participantId(me), participantId);
        return ResponseEntity.noContent().build();
    }
}
