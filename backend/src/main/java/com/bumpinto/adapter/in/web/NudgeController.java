package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.NudgeCommands;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Govde YOK, yanit YOK: 204. Durtmek bir zildir, bir kaynak yaratmaz. */
@RestController
@RequestMapping("/api/sessions/{slug}/nudge")
class NudgeController {

    private final NudgeCommands nudges;

    NudgeController(NudgeCommands nudges) {
        this.nudges = nudges;
    }

    @PostMapping("/{participantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void nudge(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
               @PathVariable UUID participantId) {
        nudges.nudge(slug, WebPrincipals.participantId(me), participantId);
    }
}
