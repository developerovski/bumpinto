package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.TokenService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Katılımcı token'ının istemciye ULAŞMA kanalı tek yerde: web hassas bilgi tutmaz, token yalnız
 * HttpOnly cookie'ye yazılır ve gövdede null döner; mobil gövdede alır (SecureStore +
 * X-Participant-Token). Üç uç (oturum kur, katıl, oturumu oku) da bu kuraldan geçer.
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
     * Token'ı ÜRETİR ve teslim eder: üretim de tek yerde durur, yoksa uçlar er geç farklı claim
     * setleri basar. Gerekiyorsa Set-Cookie ekler; gövdede dönecek değeri döndürür (web'de null).
     * Çerezin ömrü token'ın ömrüyle AYNI kaynaktan gelir.
     */
    String deliver(ResponseEntity.BodyBuilder response, String client, String slug,
                   Participant participant) {
        String token = tokens.issueParticipantToken(participant.id(), participant.sessionId(),
                slug, participant.host());
        if ("web".equalsIgnoreCase(client)) {
            response.header(HttpHeaders.SET_COOKIE,
                    cookies.participant(slug, token, TokenService.PARTICIPANT_TTL).toString());
            return null;
        }
        return token;
    }

    /**
     * Tarayıcıdaki kimliği ONARIR: hesabı olan üye, katılımcı çerezi olmayan bir tarayıcıda
     * (yeni cihaz, temizlenmiş ya da süresi dolmuş çerez) oturumu okuduğunda çerez yeniden
     * yazılır — yoksa kendi oturumunun katılım formuna düşerdi. Oda içindeki TEK yetki kaynağı
     * bu token olduğu için onarım host için de zorunludur.
     *
     * <p>Mobil bu onarımı çerezle değil katılım ucuyla yapar: kimlik taşıyan katılım aynı koltuğu
     * ve taze token'ı gövdede geri döner ({@code SessionCommands#join}). Bu yüzden burada mobil
     * için üretilen bir token sessizce düşmez — hiç üretilmez.
     */
    void refresh(ResponseEntity.BodyBuilder response, String client, String slug,
                 Participant participant) {
        if ("web".equalsIgnoreCase(client)) {
            deliver(response, client, slug, participant);
        }
    }
}
