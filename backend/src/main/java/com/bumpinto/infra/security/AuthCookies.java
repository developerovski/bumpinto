package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

@Component
public class AuthCookies {

    public static final String ACCESS = "bumpinto_at";
    static final String ACCESS_PATH = "/api";
    static final String PARTICIPANT_PREFIX = "bumpinto_pt_";

    private final AppProps props;

    public AuthCookies(AppProps props) {
        this.props = props;
    }

    public static String participantCookieName(String slug) {
        return PARTICIPANT_PREFIX + slug;
    }

    public ResponseCookie access(String token, Duration ttl) {
        return base(ACCESS, token, ACCESS_PATH, ttl);
    }

    // Web cikisi: ayni ad/yol ile Max-Age=0
    public ResponseCookie clearAccess() {
        return base(ACCESS, "", ACCESS_PATH, Duration.ZERO);
    }

    /**
     * Yol {@code /api} — oturuma DEĞİL, {@code ACCESS_PATH}'e bağlı. Daha dar bir yol
     * ({@code /api/sessions/{slug}}) ilk bakışta doğru görünür ama silmeyi imkânsız kılar:
     * tarayıcı çerezi yalnız Path'inin altındaki isteklere gönderir (RFC 6265), yani çıkış
     * ({@code /api/auth/logout}) isteği onu hiç taşımaz ve sunucu silinecek çerezi göremez.
     * Öyleyken {@link #clearParticipants} gerçek tarayıcıda no-op'tu; çıkıştan sonra tarayıcıyı
     * devralan kişi önceki katılımcı olarak yazmaya devam edebiliyordu.
     *
     * <p>Yetki genişlemesi değil: oturum yalıtımı ÇEREZ ADINDAN gelir (istenen slug'ın adı
     * aranır) ve sunucu ayrıca token'ın o oturuma ait olduğunu doğrular
     * ({@code ParticipantTokenFilter}). Yol bir savunma katmanı değil, teslimat kapsamıydı.
     */
    public ResponseCookie participant(String slug, String token, Duration ttl) {
        return base(participantCookieName(slug), token, ACCESS_PATH, ttl);
    }

    /**
     * Tarayıcıdaki TÜM katılımcı çerezlerini silen Set-Cookie'ler. Katılımcı token'ı hesaba
     * değil TARAYICIYA yazılır; çıkışta ve hesap değişiminde temizlenmezse bir sonraki
     * kullanıcıya devreder. Gerçekte olan buydu: oturumu kuran host'un katılımcı token'ı,
     * aynı tarayıcıda başka bir Google hesabına geçildikten sonra da duruyordu (2026-09-03).
     *
     * <p>Silmenin iş görmesi için ad VE yol yazarkenki ile aynı olmalı; ikisi de
     * {@link #participant} ile tek kaynaktan gelir. Silinecek adlar isteğin TAŞIDIĞI
     * çerezlerden okunur — bu yüzden çerezin yolu çıkış/giriş uçlarını kapsamak zorundadır.
     */
    public List<ResponseCookie> clearParticipants(HttpServletRequest request) {
        Cookie[] present = request.getCookies();
        if (present == null) {
            return List.of();
        }
        return Arrays.stream(present)
                .map(Cookie::getName)
                .filter(name -> name.startsWith(PARTICIPANT_PREFIX)
                        && name.length() > PARTICIPANT_PREFIX.length())
                .distinct()
                // IKI yola birden silme yazilir: cerez (ad, domain, PATH) ile saklanir ve
                // katilimci cerezinin yolu bir kez /api/sessions/{slug} -> /api olarak
                // genisletildi. Yalniz yeni yola silme yazmak eskisini ERISILMEZ birakiyordu:
                // tarayici ikisini de gonderiyor, silinemiyor ve bayat olan yenisini golgeliyor.
                .flatMap(name -> Stream.of(
                        base(name, "", ACCESS_PATH, Duration.ZERO),
                        base(name, "", legacyParticipantPath(name), Duration.ZERO)))
                .toList();
    }

    /** Cerezin genisletilmeden ONCEKI yolu; yalnizca silme icin uretilir. */
    private static String legacyParticipantPath(String cookieName) {
        return "/api/sessions/" + cookieName.substring(PARTICIPANT_PREFIX.length());
    }

    private ResponseCookie base(String name, String value, String path, Duration ttl) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cookies().secure())
                .sameSite("Lax")
                .path(path)
                .maxAge(ttl);
        if (props.cookies().domain() != null && !props.cookies().domain().isBlank()) {
            builder.domain(props.cookies().domain());
        }
        return builder.build();
    }
}
