package com.bumpinto.infra.security;

import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bean DEĞİL: Boot her Filter bean'ini servlet zincirine de kaydeder, o da bu filtreyi
 * istek başına iki kez (iki DB okuması) çalıştırırdı. Yalnızca SecurityConfig kurar.
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
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String slug = slugOf(request);
            String token = resolveToken(request, slug);
            if (token != null) {
                store.participantByToken(token)
                        .filter(p -> ownsRequestedSession(p, slug))
                        .ifPresent(p -> {
                            var auth = new UsernamePasswordAuthenticationToken(
                                    new ParticipantPrincipal(p.id(), p.sessionId(), p.host()), null,
                                    List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        });
            }
        }
        chain.doFilter(request, response);
    }

    /**
     * Token'in ait oldugu oturum ile istegin hedefledigi oturum ayni olmali. Kontrol burada durur:
     * her controller'a birakilirsa er gec biri unutur ve A oturumu token'i B oturumunu acar.
     */
    private boolean ownsRequestedSession(Participant participant, String slug) {
        if (slug == null) {
            return false; // fail-closed: katilimci token'i yalnizca /api/sessions/{slug}/... yollarinda gecerli
        }
        return store.sessionBySlug(slug)
                .map(session -> session.id().equals(participant.sessionId()))
                .orElse(false);
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
        if (slug == null || request.getCookies() == null) {
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
