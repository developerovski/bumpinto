package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.AuthCookies;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Katılımcı token'ının istemciye ULAŞMA kanalı tek yerde: web hassas bilgi tutmaz, token yalnız
 * HttpOnly cookie'ye yazılır ve gövdede null döner; mobil gövdede alır (SecureStore +
 * X-Participant-Token). İki uç (oturum kur, katıl) da bu kuraldan geçer.
 */
@Component
class ParticipantTokenDelivery {

    private static final Duration TTL = Duration.ofHours(24);

    private final AuthCookies cookies;

    ParticipantTokenDelivery(AuthCookies cookies) {
        this.cookies = cookies;
    }

    /** Gerekiyorsa Set-Cookie ekler; gövdede dönecek değeri döndürür (web'de null). */
    String deliver(ResponseEntity.BodyBuilder response, String client, String slug, String token) {
        if ("web".equalsIgnoreCase(client)) {
            response.header(HttpHeaders.SET_COOKIE,
                    cookies.participant(slug, token, TTL).toString());
            return null;
        }
        return token;
    }
}
