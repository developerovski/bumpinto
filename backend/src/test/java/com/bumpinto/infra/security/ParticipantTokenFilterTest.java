package com.bumpinto.infra.security;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ParticipantTokenFilterTest {

    final FakeStores.InMemorySessionStore store = new FakeStores.InMemorySessionStore();
    final UUID hostUserId = UUID.randomUUID();
    final UUID sessionId = session("x7k2m");
    final UUID otherSessionId = session("q3n8p");

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    UUID session(String slug) {
        UUID id = UUID.randomUUID();
        store.saveSession(new Session(id, slug, hostUserId, "Kahve", ActivityType.COFFEE,
                SessionType.GROUP, SessionStatus.COLLECTING, Instant.now().plus(6, ChronoUnit.HOURS),
                null, List.of()));
        return id;
    }

    void participantWithToken(UUID inSession, String token) {
        store.saveParticipant(new Participant(UUID.randomUUID(), inSession, "Ayşe",
                null, false, token, null, false, null));
    }

    void hostWithToken(UUID inSession, String token) {
        store.saveParticipant(new Participant(UUID.randomUUID(), inSession, "Mehmet",
                null, true, token, null, false, null));
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

    /** Hesap cerezinin (bumpinto_at) zaten dogrulanmis halini taklit eder: bearer filtresi once kosar. */
    void accountSignedInAs(UUID userId) {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "HS256").subject(userId.toString())
                .claim("email", "x@bumpinto.test").build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
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

    /**
     * Ayni tarayicida IKI kimlik olabilir: hesap cerezi (bumpinto_at) ve katilimci cerezi.
     * Hesap oturumun host'u DEGILSE dar olan kimlik kazanir. Onceden bearer filtresi
     * katilimci principal'ini eziyordu: Google ile girmis bir davetli katildiktan sonra
     * kendi konumunu bile kaydedemiyor, her yazma 403 "participant token required" donuyordu.
     */
    @Test
    void participantTokenBeatsAnAccountTokenThatIsNotTheHost() throws Exception {
        participantWithToken(sessionId, "tok-1");
        accountSignedInAs(UUID.randomUUID());

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m", "tok-1"));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
    }

    /**
     * Host'un tarayicisinda iki cerez de vardir (oturumu kuran uc katilimci cerezini de yazar).
     * Orada JWT KALMALI: find-venues/shuffle/force-decision @AuthenticationPrincipal Jwt bekler,
     * host'un katilimci kimligi zaten JWT'den turetilir (SessionQueries.hostParticipantId).
     */
    @Test
    void hostAccountTokenSurvivesItsOwnParticipantCookie() throws Exception {
        participantWithToken(sessionId, "tok-host");
        accountSignedInAs(hostUserId);

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m", "tok-host"));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(Jwt.class);
    }

    /**
     * Host'un katilimci cerezi oturumu kuran HESABA aittir. Ayni tarayicida baska bir Google
     * hesabina gecildiginde cerez geride kalir (cikis onu silmiyordu) ve o tarayici host adina
     * yazabilirdi. Devralinmis cerez kabul edilmez: kimlik hesaba geri duser, kisi davetli
     * olarak katilir.
     */
    @Test
    void inheritedHostCookieIsIgnoredWhileAnotherAccountIsSignedIn() throws Exception {
        hostWithToken(sessionId, "tok-host");
        accountSignedInAs(UUID.randomUUID());

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m", "tok-host"));

        assertThat(auth.getPrincipal()).isInstanceOf(Jwt.class);
    }

    /** Hesap cerezi yoksa host kendi katilimci cerezi ile calismaya devam eder. */
    @Test
    void hostCookieStillWorksWithoutAnAccountToken() throws Exception {
        hostWithToken(sessionId, "tok-host");

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m", "tok-host"));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
    }

    @Test
    void tokenForUnknownSlugIsRejected() throws Exception {
        participantWithToken(sessionId, "tok-1");

        assertThat(filter(headerRequest("/api/sessions/yoktur/swipes", "tok-1"))).isNull();
    }
}
