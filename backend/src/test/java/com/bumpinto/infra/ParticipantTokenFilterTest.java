package com.bumpinto.infra;

import com.bumpinto.application.FakeStores;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ParticipantTokenFilterTest {

    final FakeStores.InMemorySessionStore store = new FakeStores.InMemorySessionStore();
    final UUID sessionId = session("x7k2m");
    final UUID otherSessionId = session("q3n8p");

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    UUID session(String slug) {
        UUID id = UUID.randomUUID();
        store.saveSession(new Session(id, slug, UUID.randomUUID(), "Kahve", ActivityType.COFFEE,
                SessionStatus.COLLECTING, Instant.now().plus(6, ChronoUnit.HOURS), null, List.of()));
        return id;
    }

    void participantWithToken(UUID inSession, String token) {
        store.saveParticipant(new Participant(UUID.randomUUID(), inSession, "Ayşe",
                null, false, token, null));
    }

    Authentication filter(MockHttpServletRequest req) throws Exception {
        new ParticipantTokenFilter(store)
                .doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }

    static MockHttpServletRequest headerRequest(String uri, String token) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        if (uri != null) {
            req.setRequestURI(uri);
        }
        req.addHeader(ParticipantTokenFilter.HEADER, token);
        return req;
    }

    static MockHttpServletRequest cookieRequest(String uri, String cookieSlug, String token) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI(uri);
        req.setCookies(new Cookie(AuthCookies.participantCookieName(cookieSlug), token));
        return req;
    }

    @Test
    void participantTokenOutsideSessionPathIsRejected() throws Exception {
        participantWithToken(sessionId, "tok-1");

        assertThat(filter(headerRequest("/api/whoami", "tok-1"))).isNull();
    }

    @Test
    void headerTokenOnItsOwnSessionPathSetsPrincipal() throws Exception {
        participantWithToken(sessionId, "tok-1");

        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", "tok-1"))).isNotNull();
    }

    @Test
    void slugScopedCookieSetsPrincipal() throws Exception {
        participantWithToken(sessionId, "tok-2");

        assertThat(filter(cookieRequest("/api/sessions/x7k2m/swipes", "x7k2m", "tok-2"))).isNotNull();
    }

    @Test
    void unknownTokenLeavesContextEmpty() throws Exception {
        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", "yok"))).isNull();
    }

    /** A oturumunun token'i B oturumunun ucunu acmaz — kontrol filtrededir, controller'da degil. */
    @Test
    void headerTokenFromAnotherSessionIsRejected() throws Exception {
        participantWithToken(otherSessionId, "tok-other");

        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", "tok-other"))).isNull();
    }

    @Test
    void cookieTokenFromAnotherSessionIsRejected() throws Exception {
        participantWithToken(otherSessionId, "tok-other");

        assertThat(filter(cookieRequest("/api/sessions/x7k2m/swipes", "x7k2m", "tok-other"))).isNull();
    }

    @Test
    void tokenForUnknownSlugIsRejected() throws Exception {
        participantWithToken(sessionId, "tok-1");

        assertThat(filter(headerRequest("/api/sessions/yoktur/swipes", "tok-1"))).isNull();
    }
}
