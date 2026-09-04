package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.TokenService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Katılımcı token'ının istemciye ULAŞMA kanalı tek yerde: web hassas bilgi tutmaz, token yalnız
 * HttpOnly cookie'ye yazılır ve gövdede null döner; mobil gövdede alır (SecureStore +
 * X-Participant-Token). İki uç (oturum kur, katıl) da bu kuraldan geçer.
 */
@Component
class ParticipantTokenDelivery {

    private final AuthCookies cookies;
    private final TokenService tokens;

    ParticipantTokenDelivery(AuthCookies cookies, TokenService tokens) {
        this.cookies = cookies;
        this.tokens = tokens;
    }

    /**
     * Token'ı ÜRETİR ve teslim eder: üretim de tek yerde durur, yoksa iki uç (oturum kur, katıl)
     * er geç farklı claim setleri basar. Gerekiyorsa Set-Cookie ekler; gövdede dönecek değeri
     * döndürür (web'de null). Çerezin ömrü token'ın ömrüyle AYNI kaynaktan gelir.
     */
    String deliver(ResponseEntity.BodyBuilder response, String client, Session session,
                   Participant participant) {
        String slug = session.slug();
        String token = tokens.issueParticipantToken(participant.id(), participant.sessionId(),
                slug, participant.host(), session.hostId());
        if ("web".equalsIgnoreCase(client)) {
            response.header(HttpHeaders.SET_COOKIE,
                    cookies.participant(slug, token, TokenService.PARTICIPANT_TTL).toString());
            return null;
        }
        return token;
    }
}
