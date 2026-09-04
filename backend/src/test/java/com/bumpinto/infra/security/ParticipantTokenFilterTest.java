package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
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

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Katılımcı kimliği artık İMZALI bir JWT'den çözülür: doğrulama tamamen bellekte biter,
 * filtre hiç DB okumaz. Testler de gerçek token üretir — sahte bir depo kurulumu yoktur.
 */
class ParticipantTokenFilterTest {

    static final UUID SESSION_ID = UUID.randomUUID();
    static final UUID OTHER_SESSION_ID = UUID.randomUUID();
    static final UUID HOST_USER_ID = UUID.randomUUID();

    final TokenService tokens = tokenService(Clock.systemUTC());

    static TokenService tokenService(Clock clock) {
        return new TokenService(new AppProps(
                new AppProps.Security("cid", "0123456789abcdef0123456789abcdef", Duration.ofHours(12)),
                new AppProps.Providers("", ""),
                new AppProps.Cors(List.of()),
                new AppProps.Cookies(true, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000, 5000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO)), clock);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    String participantToken(String slug) {
        return tokens.issueParticipantToken(UUID.randomUUID(), SESSION_ID, slug, false);
    }

    String hostToken(String slug) {
        return tokens.issueParticipantToken(UUID.randomUUID(), SESSION_ID, slug, true);
    }

    /** Hesap çerezinin doğrulanmış hâlini taklit eder: bearer filtresi filtreden ÖNCE koşar. */
    void accountSignedInAs(UUID userId) {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "HS256").subject(userId.toString())
                .claim("email", "x@bumpinto.test").build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
    }

    Authentication filter(MockHttpServletRequest req) throws Exception {
        new ParticipantTokenFilter(tokens.decoder())
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
        assertThat(filter(headerRequest("/api/whoami", participantToken("x7k2m")))).isNull();
    }

    @Test
    void headerTokenOnItsOwnSessionPathSetsPrincipal() throws Exception {
        Authentication auth = filter(headerRequest("/api/sessions/x7k2m/swipes",
                participantToken("x7k2m")));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
        assertThat(((ParticipantPrincipal) auth.getPrincipal()).sessionId()).isEqualTo(SESSION_ID);
    }

    @Test
    void slugScopedCookieSetsPrincipal() throws Exception {
        assertThat(filter(cookieRequest("/api/sessions/x7k2m/swipes", "x7k2m",
                participantToken("x7k2m")))).isNotNull();
    }

    @Test
    void unknownTokenLeavesContextEmpty() throws Exception {
        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", "yok"))).isNull();
    }

    /** A oturumunun token'i B oturumunun ucunu acmaz — kontrol filtrededir, controller'da degil. */
    @Test
    void headerTokenFromAnotherSessionIsRejected() throws Exception {
        String other = tokens.issueParticipantToken(UUID.randomUUID(), OTHER_SESSION_ID, "q3n8p",
                false);

        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", other))).isNull();
    }

    @Test
    void cookieTokenFromAnotherSessionIsRejected() throws Exception {
        String other = tokens.issueParticipantToken(UUID.randomUUID(), OTHER_SESSION_ID, "q3n8p",
                false);

        assertThat(filter(cookieRequest("/api/sessions/x7k2m/swipes", "x7k2m", other))).isNull();
    }

    /** Suresi dolmus token kimlik dogrulamaz; oturum TTL'i ile ayni pencere (24s). */
    @Test
    void expiredTokenIsRejected() throws Exception {
        String stale = tokenService(Clock.fixed(Instant.now().minus(Duration.ofHours(25)),
                ZoneOffset.UTC)).issueParticipantToken(UUID.randomUUID(), SESSION_ID, "x7k2m",
                false);

        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", stale))).isNull();
    }

    /**
     * Ters yon: HESAP token'i katilimci kimligi olarak kabul EDILMEZ. Ikisini de ayni sir
     * imzaladigi icin tur ayrimi (typ=pt) olmasa bir hesap JWT'si, sahibi o oturumun uyesi
     * olmasa bile katilimci principal'i kurardi.
     */
    @Test
    void accountTokenIsNotAParticipantToken() throws Exception {
        String account = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");

        assertThat(filter(headerRequest("/api/sessions/x7k2m/swipes", account))).isNull();
    }

    /**
     * Ayni tarayicida IKI kimlik olabilir: hesap cerezi (bumpinto_at) ve katilimci cerezi.
     * Hesap oturumun host'u DEGILSE dar olan kimlik kazanir. Onceden bearer filtresi
     * katilimci principal'ini eziyordu: Google ile girmis bir davetli katildiktan sonra
     * kendi konumunu bile kaydedemiyor, her yazma 403 "participant token required" donuyordu.
     */
    @Test
    void participantTokenBeatsAnAccountTokenThatIsNotTheHost() throws Exception {
        accountSignedInAs(UUID.randomUUID());

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m",
                participantToken("x7k2m")));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
    }

    /**
     * Oda ICINDE token KAZANIR — oturumun sahibi icin de. Filtre artik "bu tarayicidaki hesap
     * oturumun sahibi mi" diye SORMAZ: host/misafir ayrimi bir YETKI karari ve yeri uygulama
     * katmanidir ({@code DeckFlow#requireHost} koltugu DB'den okur). Eski iki gecit ve onlari
     * besleyen huid claim'i, host'un kendi oturumunda misafir koltugu acabildigi dunyaya aitti;
     * {@code SessionCommands#join} artik ayni cagirana ikinci koltuk actirmiyor.
     */
    @Test
    void theParticipantTokenWinsInsideTheRoomEvenForTheSessionOwner() throws Exception {
        accountSignedInAs(HOST_USER_ID);

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m",
                hostToken("x7k2m")));

        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
        assertThat(((ParticipantPrincipal) auth.getPrincipal()).host()).isTrue();
    }

    /**
     * Katilimci principal'i hesap kimligini EZER ama YOK ETMEZ. Tarayicida kalmis bir cerez
     * YANLIS koltugu gosteriyor olabilir (uye once anonim katilip sonra giris yaptiysa); hesap
     * kaybolursa onarim yolu da kaybolurdu (bkz. WebPrincipals#seatOf).
     */
    @Test
    void theAccountIdentitySurvivesUnderneathTheParticipantPrincipal() throws Exception {
        accountSignedInAs(HOST_USER_ID);

        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m",
                participantToken("x7k2m")));

        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
        assertThat(auth.getDetails()).isInstanceOfSatisfying(Jwt.class,
                jwt -> assertThat(jwt.getSubject()).isEqualTo(HOST_USER_ID.toString()));
    }

    /** Hesap cerezi yoksa host kendi katilimci cerezi ile calismaya devam eder. */
    @Test
    void hostCookieStillWorksWithoutAnAccountToken() throws Exception {
        Authentication auth = filter(cookieRequest("/api/sessions/x7k2m/location", "x7k2m",
                hostToken("x7k2m")));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(ParticipantPrincipal.class);
        assertThat(((ParticipantPrincipal) auth.getPrincipal()).host()).isTrue();
    }
}
