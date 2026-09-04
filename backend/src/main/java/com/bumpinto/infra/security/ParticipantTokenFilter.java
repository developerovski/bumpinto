package com.bumpinto.infra.security;

import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
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
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bean DEĞİL: Boot her Filter bean'ini servlet zincirine de kaydeder, o da bu filtreyi
 * istek başına iki kez (iki DB okuması) çalıştırırdı. Yalnızca SecurityConfig kurar.
 *
 * <p>Bearer filtresinden SONRA kurulur ve gerektiğinde hesap kimliğinin ÜSTÜNE yazar.
 * Sıra tersi olamaz: Spring'in {@code BearerTokenAuthenticationFilter}'ı context'i koşulsuz
 * değiştirir, ondan önce konan katılımcı principal'i hiçbir zaman hayatta kalmazdı. Aynı
 * tarayıcıda iki çerez birden bulunabilir (bumpinto_at + bumpinto_pt_{slug}) ve Google ile
 * girmiş bir davetli katıldıktan sonra KENDİ konumunu bile kaydedemiyordu: yazma tarafı
 * JWT'yi görüp host eşleştirmesine düşüyor, davetli host olmadığı için 403 "participant token
 * required" dönüyordu (2026-09-03).
 *
 * <p>Tek istisna, oturumun HOST'una ait JWT: o yerinde kalır. Host uçları
 * ({@code @AuthenticationPrincipal Jwt}) ona bağlıdır ve host'un katılımcı kimliği zaten
 * JWT'den türetilir ({@code SessionQueries.hostParticipantId}) — host'un tarayıcısında iki
 * çerez de vardır, dar kimlik oraya uygulanırsa "Mekanları bul" 403 döner.
 *
 * <p>Ters yönde de bir kapı var: HOST'un katılımcı çerezi, tarayıcıda BAŞKA bir hesap açıkken
 * kabul edilmez. O çerez oturumu kuran hesaba aittir; tarayıcı artık başka biriyse çerez
 * devralınmıştır (çıkışta/hesap değişiminde {@code AuthCookies.clearParticipants} temizler,
 * ama zaten tarayıcıda duranı da geçersiz saymak gerekir). Davetli çerezleri bir hesaba bağlı
 * olmadığı için bu kural yalnız host çerezine uygulanır.
 */
public class ParticipantTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Participant-Token";
    private static final Pattern SLUG = Pattern.compile("^/api/sessions/([^/]+)");

    private final SessionStorePort store;

    public ParticipantTokenFilter(SessionStorePort store) {
        this.store = store;
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
            // Oturum TEK okumayla gelir: hem "JWT bu oturumun host'u mu" hem de token'in
            // dogru oturuma ait olup olmadigi ayni kayittan cevaplanir.
            store.sessionBySlug(slug)
                    .filter(session -> !signedInAsHostOf(session))
                    .flatMap(session -> store.participantByToken(token)
                            .filter(p -> p.sessionId().equals(session.id()))
                            // Buraya gelen JWT (varsa) bu oturumun host'u DEGIL: yanindaki host
                            // katilimci cerezi devralinmis demektir, kabul edilmez.
                            .filter(p -> !p.host() || !signedInWithAnAccount()))
                    .ifPresent(ParticipantTokenFilter::authenticate);
        }
        chain.doFilter(request, response);
    }

    private static void authenticate(Participant participant) {
        var auth = new UsernamePasswordAuthenticationToken(
                new ParticipantPrincipal(participant.id(), participant.sessionId(),
                        participant.host()), null,
                List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /** İstek bir hesap kimliği taşıyor mu (bumpinto_at / Bearer). */
    private static boolean signedInWithAnAccount() {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        return current != null && current.getPrincipal() instanceof Jwt;
    }

    /** İsteği yapan hesap bu oturumun kurucusu mu — JWT'yi bearer filtresi zaten doğruladı. */
    private static boolean signedInAsHostOf(Session session) {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        if (current == null || !(current.getPrincipal() instanceof Jwt jwt)) {
            return false;
        }
        String subject = jwt.getSubject();
        if (subject == null) {
            return false;
        }
        try {
            return session.hostId().equals(UUID.fromString(subject));
        } catch (IllegalArgumentException notAUuid) {
            return false; // sub bir userId degilse host sayilmaz (fail-closed)
        }
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
