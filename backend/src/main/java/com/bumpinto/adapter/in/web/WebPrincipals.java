package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

/**
 * Kimlik doğrulama filtrelerde biter; burada yalnızca principal'ın DOĞRU TÜRDE olduğu kontrol
 * edilir. Yanlış tür (ör. host ucunda katılımcı token'ı) @AuthenticationPrincipal'dan null gelir;
 * guard olmasa NPE → 500 olurdu, doğrusu 403.
 */
final class WebPrincipals {

    private WebPrincipals() {
    }

    static UUID hostUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenException("host authentication required");
        }
        return UUID.fromString(jwt.getSubject()); // backend token: sub = userId
    }

    static UUID participantId(ParticipantPrincipal me) {
        if (me == null) {
            throw new ForbiddenException("participant token required");
        }
        return me.participantId();
    }
}
