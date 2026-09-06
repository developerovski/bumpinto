package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.VoiceCommands;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ses odasi durumu REST'ten (spec K3); sinyal STOMP'tan (VoiceSignalController). Uyelik burada
 * DEGIL: kisi kendi sinyal konusuna abone olunca uye olur (VoiceRoomListener, K4).
 *
 * <p>Host uclari da katilimci principal'i alir: oda ici kimlik TEK turdur (katilimci token'i),
 * host'a ozel bir hesap kimligi degil — host da bir katilimcidir.
 */
@RestController
@RequestMapping("/api/sessions/{slug}/voice")
class VoiceController {

    private final VoiceCommands voice;

    VoiceController(VoiceCommands voice) {
        this.voice = voice;
    }

    @PostMapping
    ApiDtos.VoiceStartResponse start(@AuthenticationPrincipal ParticipantPrincipal me,
                                     @PathVariable String slug) {
        return new ApiDtos.VoiceStartResponse(
                voice.start(slug, WebPrincipals.participantId(me)).endsAt());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void end(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug) {
        voice.end(slug, WebPrincipals.participantId(me));
    }

    @PostMapping("/credentials")
    ApiDtos.VoiceCredentialsResponse credentials(@AuthenticationPrincipal ParticipantPrincipal me,
                                                 @PathVariable String slug) {
        VoiceCommands.Credentials c = voice.credentials(slug, WebPrincipals.participantId(me));
        return new ApiDtos.VoiceCredentialsResponse(c.ice().iceServers().stream()
                .map(s -> new ApiDtos.IceServerDto(s.urls(), s.username(), s.credential())).toList(),
                c.ice().relay(), c.endsAt());
    }
}
