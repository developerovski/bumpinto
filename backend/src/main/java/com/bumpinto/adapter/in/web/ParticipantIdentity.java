package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Katılımcı eylemlerinde (kaydır, geri al, desteyi bitir, eleme oyu, konum) "ben kimim".
 *
 * <p>İki geçerli kimlik vardır ve İKİSİ DE burada karşılanır: katılımcı token'ı ve koltuğun
 * sahibi hesabın JWT'si. Yalnız token kabul edilirse üye, katılımcı çerezi olmayan her
 * tarayıcıda deste ekranını görür, kartları kaydırır ve HİÇBİR yazma sunucuya ulaşmaz (bkz.
 * {@link SessionQueries#participantIdOf}).
 *
 * <p>Okuma tarafı bu eşitlemeyi zaten yapıyordu ({@link WebPrincipals#viewerOf}); asimetri
 * tam olarak bu hatanın kaynağıydı, o yüzden çözüm tek yerde durur: her controller'a
 * bırakılırsa er geç biri unutur.
 */
@Component
class ParticipantIdentity {

    private final SessionQueries queries;

    ParticipantIdentity(SessionQueries queries) {
        this.queries = queries;
    }

    /** Başka bir hesabın JWT'si ya da kimliksiz istek: 403 (NPE ile 500 değil). */
    UUID of(Authentication auth, String slug) {
        return switch (auth == null ? null : auth.getPrincipal()) {
            case ParticipantPrincipal me -> me.participantId();
            case Jwt jwt -> queries.participantIdOf(slug, WebPrincipals.accountId(jwt))
                    .orElseThrow(ParticipantIdentity::required);
            case null, default -> throw required();
        };
    }

    private static ForbiddenException required() {
        return new ForbiddenException("participant token required");
    }
}
