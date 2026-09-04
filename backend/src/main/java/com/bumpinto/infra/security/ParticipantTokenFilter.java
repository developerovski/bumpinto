package com.bumpinto.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bean DEĞİL: Boot her Filter bean'ini servlet zincirine de kaydeder, o da bu filtreyi
 * istek başına iki kez çalıştırırdı. Yalnızca SecurityConfig kurar.
 *
 * <p>Tek işi vardır: <b>kimlik var mı</b>. İmza + iki claim karşılaştırması, SIFIR DB okuması ve
 * SIFIR yetki kararı. "Bu kişi host mu, üye mi, ne yapabilir" sorularının hiçbiri buraya ait
 * değildir; hepsi uygulama katmanında, veriye bakarak yanıtlanır ({@code DeckFlow.requireHost},
 * {@code requireMember}, {@code SessionCommands.updateLocation}). Bu yüzden silinmiş bir
 * katılımcının token'ı imzası geçerli olsa da hiçbir şey yazamaz.
 *
 * <p>Bearer filtresinden SONRA kurulur ve hesap kimliğinin ÜSTÜNE yazar. Sıra tersi olamaz:
 * Spring'in {@code BearerTokenAuthenticationFilter}'ı context'i koşulsuz değiştirir, ondan önce
 * konan katılımcı principal'i hiçbir zaman hayatta kalmazdı — Google ile girmiş bir davetli
 * katıldıktan sonra kendi konumunu bile kaydedemiyordu (2026-09-03).
 *
 * <p>Katılımcı principal'i hesap principal'inin üstüne yazar ama hesap kimliğini YOK ETMEZ:
 * doğrulanmış {@code Jwt} {@code details}'e asılır. Çünkü tarayıcıda kalmış bir katılımcı çerezi
 * yanlış koltuğu gösteriyor olabilir — üye önce anonim katılıp sonra giriş yapmışsa, o çerez
 * kendi oturumunun sahibini bile misafire çevirirdi. Hangi koltuğun doğru olduğunu ancak VERİYE
 * bakan katman bilir ({@code WebPrincipals.seatOf}, {@code participants.user_id}); filtre o kararı
 * vermez, yalnızca iki kimliği de sonraki katmana taşır.
 */
public class ParticipantTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Participant-Token";
    private static final Pattern SLUG = Pattern.compile("^/api/sessions/([^/]+)");

    private final JwtDecoder decoder;

    public ParticipantTokenFilter(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        // slug yoksa katilimci token'i hicbir sey acmaz (fail-closed): token'in ait oldugu
        // oturum ile istegin hedefledigi oturum ayni olmali. Kontrol burada durur; her
        // controller'a birakilirsa er gec biri unutur ve A oturumu token'i B'yi acar.
        String slug = slugOf(request);
        String token = slug == null ? null : resolveToken(request, slug);
        if (token != null) {
            participantOf(token, slug).ifPresent(ParticipantTokenFilter::authenticate);
        }
        chain.doFilter(request, response);
    }

    /** Gecersiz/baska oturuma ait/yanlis turde token: kimlik YOK (401 degil — istek anonim sayilir). */
    private Optional<ParticipantPrincipal> participantOf(String token, String slug) {
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

    private static void authenticate(ParticipantPrincipal participant) {
        Authentication previous = SecurityContextHolder.getContext().getAuthentication();
        var auth = new UsernamePasswordAuthenticationToken(participant, null,
                List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
        if (previous != null && previous.getPrincipal() instanceof Jwt account) {
            auth.setDetails(account); // uzerine yazilan hesap kimligi: kaybolmaz, yanda durur
        }
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static String slugOf(HttpServletRequest request) {
        Matcher m = SLUG.matcher(request.getRequestURI());
        return m.find() ? m.group(1) : null;
    }

    private String resolveToken(HttpServletRequest request, String slug) {
        String header = request.getHeader(HEADER);
        if (header != null) {
            return header; // mobil / SecureStore yolu
        }
        if (request.getCookies() == null) {
            return null;
        }
        String cookieName = AuthCookies.participantCookieName(slug);
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue(); // web / HttpOnly cookie yolu
            }
        }
        return null;
    }
}
