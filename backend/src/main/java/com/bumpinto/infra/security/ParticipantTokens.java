package com.bumpinto.infra.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "Bu istek gecerli bir KATILIMCI kimligi tasiyor mu" sorusunun TEK cevap yeri.
 *
 * <p>Iki cagirani var ve ikisinin AYNI cevabi vermesi sart: {@link ParticipantTokenFilter}
 * kimligi KURAR, {@link SecurityConfig}'in bearer resolver'i bayat bir hesap jetonunu
 * dusurup dusurmeyecegine karar verirken BAKAR. Iki ayri kopya yazilsaydi biri duzeltilip
 * digeri unutulur, K-M38 yarim kapanirdi.
 */
public final class ParticipantTokens {

    public static final String HEADER = "X-Participant-Token";
    private static final Pattern SLUG = Pattern.compile("^/api/sessions/([^/]+)");

    private ParticipantTokens() {
    }

    /**
     * Istegin hedefledigi oturum. slug yoksa katilimci token'i hicbir sey acmaz (fail-closed):
     * token'in ait oldugu oturum ile istegin hedefledigi oturum ayni olmali. Kontrol burada
     * durur; her controller'a birakilirsa er gec biri unutur ve A oturumu token'i B'yi acar.
     */
    public static String slugOf(HttpServletRequest request) {
        Matcher m = SLUG.matcher(request.getRequestURI());
        return m.find() ? m.group(1) : null;
    }

    /**
     * ADAYLARIN HEPSI denenir, ilki degil: tarayicida ayni isimli BIRDEN COK cerez olabilir
     * (cerez (ad, domain, path) ile saklanir; path bir kez genisletildi ve eski yola yazilmis
     * olan silinemedigi icin orada kaldi). RFC 6265 daha spesifik path'i ONE koyar, yani "ilk
     * eslesen" tam olarak BAYAT olanidir ve uye kendi oturumunda 403 alirdi.
     */
    public static Optional<ParticipantPrincipal> resolve(HttpServletRequest request,
                                                         JwtDecoder decoder) {
        String slug = slugOf(request);
        if (slug == null) {
            return Optional.empty();
        }
        return candidates(request, slug).stream()
                .map(token -> participantOf(decoder, token, slug))
                .flatMap(Optional::stream)
                .findFirst();
    }

    /** Bayat bearer'in dusurulup dusurulmeyecegi karari (bkz. SecurityConfig javadoc'u). */
    public static boolean carriedBy(HttpServletRequest request, JwtDecoder decoder) {
        return resolve(request, decoder).isPresent();
    }

    /** Gecersiz/baska oturuma ait/yanlis turde token: kimlik YOK (401 degil — anonim sayilir). */
    private static Optional<ParticipantPrincipal> participantOf(JwtDecoder decoder, String token,
                                                                String slug) {
        try {
            Jwt jwt = decoder.decode(token);
            if (!TokenService.PARTICIPANT_TYPE.equals(jwt.getClaimAsString(TokenService.TYPE_CLAIM))
                    || !slug.equals(jwt.getClaimAsString(TokenService.SLUG_CLAIM))) {
                return Optional.empty();
            }
            return Optional.of(new ParticipantPrincipal(
                    UUID.fromString(jwt.getSubject()),
                    UUID.fromString(jwt.getClaimAsString(TokenService.SESSION_CLAIM)),
                    Boolean.TRUE.equals(jwt.getClaim(TokenService.HOST_CLAIM))));
        } catch (JwtException | IllegalArgumentException | NullPointerException invalid) {
            return Optional.empty();
        }
    }

    /** Basliktaki token (mobil) once, sonra ayni adi tasiyan TUM cerezler (web) — sirayla. */
    private static List<String> candidates(HttpServletRequest request, String slug) {
        List<String> candidates = new ArrayList<>();
        String header = request.getHeader(HEADER);
        if (header != null) {
            candidates.add(header); // mobil / SecureStore yolu
        }
        if (request.getCookies() != null) {
            String cookieName = AuthCookies.participantCookieName(slug);
            for (Cookie cookie : request.getCookies()) {
                if (cookieName.equals(cookie.getName())) {
                    candidates.add(cookie.getValue()); // web / HttpOnly cookie yolu
                }
            }
        }
        return candidates;
    }
}
