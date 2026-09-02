package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

/**
 * Kimlik doğrulama filtrelerde biter; burada yalnızca principal'ın DOĞRU TÜRDE olduğu kontrol
 * edilir. Yanlış tür (ör. host ucunda katılımcı token'ı) @AuthenticationPrincipal'dan null gelir;
 * guard olmasa NPE → 500 olurdu, doğrusu 403.
 *
 * <p>Katılımcı ucları bunun tersini ({@code Jwt} → katılımcı) {@link ParticipantIdentity}
 * üzerinden çözer: host da bir katılımcıdır ve her tarayıcıda çerezi olmayabilir.
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

    /** Kimliksiz ya da uye olmayan cagiran icin null. */
    static ApiDtos.ViewerDto viewerOf(SessionQueries.SessionSnapshot snap, Authentication auth) {
        if (auth == null) {
            return null;
        }
        return switch (auth.getPrincipal()) {
            case ParticipantPrincipal me -> viewer(snap, me.participantId(), me.host());
            case Jwt jwt -> hostViewerOrNull(snap, jwt);
            default -> null;
        };
    }

    /** Kendi eleme oyu goruntuleyene doner; digerlerininki bu DTO'ya hic girmez. */
    private static ApiDtos.ViewerDto viewer(SessionQueries.SessionSnapshot snap, UUID participantId,
            boolean host) {
        return new ApiDtos.ViewerDto(participantId, host, snap.runoffVotes().get(participantId));
    }

    private static ApiDtos.ViewerDto hostViewerOrNull(SessionQueries.SessionSnapshot snap, Jwt jwt) {
        if (!snap.session().hostId().equals(hostUserId(jwt))) {
            return null; // baska bir host'un JWT'si: bu oturumun uyesi degil
        }
        return snap.participants().stream()
                .filter(Participant::host)
                .findFirst()
                .map(p -> viewer(snap, p.id(), true))
                .orElse(null);
    }
}
