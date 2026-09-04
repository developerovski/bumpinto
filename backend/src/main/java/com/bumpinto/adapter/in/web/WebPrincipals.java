package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.session.Caller;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;
import java.util.UUID;

/**
 * Kimlik doğrulama filtrelerde biter; burada yalnızca principal'ın DOĞRU TÜRDE olduğu kontrol
 * edilir. Yanlış tür (ör. host ucunda katılımcı token'ı) @AuthenticationPrincipal'dan null gelir;
 * guard olmasa NPE → 500 olurdu, doğrusu 403.
 *
 * <p>Katılımcı uçları bunun tersini ({@code Jwt} → katılımcı) koltuk sahipliğinden çözer
 * ({@code participants.user_id}), host'a özel bir daldan değil.
 */
final class WebPrincipals {

    private WebPrincipals() {
    }

    static UUID accountId(Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenException("account authentication required");
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
            case Jwt ignored -> seatOf(snap, auth).map(p -> viewer(snap, p.id(), p.host()))
                    .orElse(null);
            default -> null;
        };
    }

    /**
     * Hesabin bu oturumdaki koltugu. Anlik goruntude ZATEN yuklu olan katilimcilardan cozulur:
     * ek sorgu yok. Host'a ozel bir dal DEGILDIR — davetli bir uye de katilimci cerezi olmayan
     * bir tarayicida kendi koltugunu bulur, ikinci koltuk acmaz.
     */
    static Optional<Participant> seatOf(SessionQueries.SessionSnapshot snap, Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            return Optional.empty();
        }
        UUID userId = accountId(jwt);
        return snap.participants().stream().filter(p -> userId.equals(p.userId())).findFirst();
    }

    /** Katilim ucunda "kim soruyor": koltugu ya da hesabi olan cagiran ikinci koltuk acmaz. */
    static Caller callerOf(Authentication auth) {
        return switch (auth == null ? null : auth.getPrincipal()) {
            case ParticipantPrincipal me -> Caller.participant(me.participantId());
            case Jwt jwt -> Caller.account(accountId(jwt));
            case null, default -> Caller.ANONYMOUS;
        };
    }

    /** Kendi eleme oyu goruntuleyene doner; digerlerininki bu DTO'ya hic girmez. */
    private static ApiDtos.ViewerDto viewer(SessionQueries.SessionSnapshot snap, UUID participantId,
            boolean host) {
        return new ApiDtos.ViewerDto(participantId, host, snap.runoffVotes().get(participantId));
    }
}
