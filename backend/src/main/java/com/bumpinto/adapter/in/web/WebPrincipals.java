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

    /**
     * Oda İÇİNDEKİ tek kimlik. Katılımcı token'ı yoksa (yalnız hesap çerezi olan bir tarayıcı)
     * principal null gelir: guard olmasa NPE → 500 olurdu, doğrusu 403. Çerezi olmayan üye önce
     * oturumu okur, {@link ParticipantTokenDelivery#refresh} çerezi yeniden yazar ve yazma
     * uçları çalışır.
     */
    static UUID participantId(ParticipantPrincipal me) {
        if (me == null) {
            throw new ForbiddenException("participant token required");
        }
        return me.participantId();
    }

    static UUID accountId(Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenException("account authentication required");
        }
        return UUID.fromString(jwt.getSubject()); // backend token: sub = userId
    }

    /**
     * Kimliksiz ya da uye olmayan cagiran icin null.
     *
     * <p>Hesabin koltugu ONCELIKLIDIR. Elde hem hesap hem katilimci token'i olabilir ve token
     * yanlis koltugu gosteriyor olabilir: uye kendi oturumunun linkini giris yapmadigi bir
     * tarayicida acip ANONIM katildiysa (Caller.ANONYMOUS ikinci koltuk acar), o cerez sonra
     * giris yapsa bile onu kendi oturumunda misafire cevirirdi. Hangi koltugun dogru oldugu
     * veriden bilinir ({@code participants.user_id}), tarayicida kalmis bir bearer'dan degil.
     */
    static ApiDtos.ViewerDto viewerOf(SessionQueries.SessionSnapshot snap, Authentication auth) {
        if (auth == null) {
            return null;
        }
        Optional<Participant> owned = seatOf(snap, auth);
        if (owned.isPresent()) {
            return viewer(snap, owned.get().id(), owned.get().host());
        }
        return auth.getPrincipal() instanceof ParticipantPrincipal me
                ? viewer(snap, me.participantId(), me.host()) : null;
    }

    /**
     * Hesabin bu oturumdaki koltugu. Anlik goruntude ZATEN yuklu olan katilimcilardan cozulur:
     * ek sorgu yok. Host'a ozel bir dal DEGILDIR — davetli bir uye de katilimci cerezi olmayan
     * (ya da YANLIS koltugu gosteren) bir tarayicida kendi koltugunu bulur.
     */
    static Optional<Participant> seatOf(SessionQueries.SessionSnapshot snap, Authentication auth) {
        Jwt jwt = accountOf(auth);
        if (jwt == null) {
            return Optional.empty();
        }
        UUID userId = accountId(jwt);
        return snap.participants().stream().filter(p -> userId.equals(p.userId())).findFirst();
    }

    /** Istegin tasidigi katilimci koltugu; token yoksa null. */
    static UUID participantIdOrNull(Authentication auth) {
        return auth != null && auth.getPrincipal() instanceof ParticipantPrincipal me
                ? me.participantId() : null;
    }

    /**
     * Istegin tasidigi HESAP kimligi. Katilimci filtresi principal'i ezmis olsa bile hesap
     * kaybolmaz: dogrulanmis Jwt {@code details}'te durur (bkz. ParticipantTokenFilter).
     */
    private static Jwt accountOf(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            return jwt;
        }
        return auth.getDetails() instanceof Jwt stashed ? stashed : null;
    }

    /**
     * Katilim ucunda "kim soruyor". IKI kimlik de tasinir: uygulama katmani once hesabin
     * koltuguna bakar, yoksa token'in gosterdigine — yoksa yeni koltuk acar.
     */
    static Caller callerOf(Authentication auth) {
        Jwt account = accountOf(auth);
        return new Caller(participantIdOrNull(auth),
                account == null ? null : accountId(account));
    }

    /** Kendi eleme oyu goruntuleyene doner; digerlerininki bu DTO'ya hic girmez. */
    private static ApiDtos.ViewerDto viewer(SessionQueries.SessionSnapshot snap, UUID participantId,
            boolean host) {
        return new ApiDtos.ViewerDto(participantId, host, snap.runoffVotes().get(participantId));
    }
}
