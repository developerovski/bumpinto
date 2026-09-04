package com.bumpinto.infra.security;

import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.adapter.in.web.WebSocketConfig;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.FakeStores;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pazarlık dışı güvenlik duruşunu sabitler: cookie bayrakları, path kapsamı, CORS allowlist. */
class SecurityPolicyTest {

    static AppProps props(boolean secureCookies, String domain, List<String> origins) {
        return new AppProps(
                new AppProps.Security("cid", "0123456789abcdef0123456789abcdef", Duration.ofHours(12)),
                new AppProps.Providers("", ""),
                new AppProps.Cors(origins),
                new AppProps.Cookies(secureCookies, domain),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000, 5000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
    }

    /**
     * Sirlar log'a sizmaz: toString sir DEGERINI icermez, sir olmayan alanlar okunur kalir.
     * Bir gun biri log.debug("props={}", props) yazarsa anahtar log'a dusmez.
     */
    @Test
    void appPropsToStringMasksSecretsButKeepsDiagnostics() {
        AppProps props = new AppProps(
                new AppProps.Security("cid", "super-secret-token-0123456789abcd",
                        Duration.ofHours(12)),
                new AppProps.Providers("fsq-secret-key", "gplaces-secret-key"),
                new AppProps.Cors(List.of("https://bumpinto.app")),
                new AppProps.Cookies(true, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000, 5000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));

        String printed = props.toString();

        assertThat(printed)
                .doesNotContain("super-secret-token-0123456789abcd")
                .doesNotContain("fsq-secret-key")
                .doesNotContain("gplaces-secret-key");
        assertThat(props.security().toString()).doesNotContain("super-secret-token-0123456789abcd");
        assertThat(props.providers().toString())
                .doesNotContain("fsq-secret-key")
                .doesNotContain("gplaces-secret-key");
        // Teshis degeri kaybolmaz: TTL, origin listesi, client-id ve XFF karari okunur.
        assertThat(printed).contains("PT12H", "https://bumpinto.app", "cid",
                "trustForwardedFor=false");
    }

    @Test
    void accessCookieIsHttpOnlyLaxAndScopedToApi() {
        ResponseCookie cookie = new AuthCookies(props(false, "", List.of()))
                .access("jwt", Duration.ofHours(12));

        assertThat(cookie.getName()).isEqualTo("bumpinto_at");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
        assertThat(cookie.getPath()).isEqualTo("/api");
        assertThat(cookie.isSecure()).isFalse(); // local profili
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofHours(12));
    }

    @Test
    void participantCookieIsPerSessionAndSecureInDeployedProfiles() {
        AuthCookies cookies = new AuthCookies(props(true, "", List.of()));
        ResponseCookie a = cookies.participant("x7k2m", "pt-a", Duration.ofHours(24));
        ResponseCookie b = cookies.participant("q3n8p", "pt-b", Duration.ofHours(24));

        assertThat(a.getName()).isEqualTo("bumpinto_pt_x7k2m");
        assertThat(a.isSecure()).isTrue();
        // Oturum yalitimi ADDAN gelir (+ sunucuda token->oturum dogrulamasi), yoldan degil.
        assertThat(b.getName()).isNotEqualTo(a.getName()); // coklu oturum cakismaz
        assertThat(b.getPath()).isEqualTo(a.getPath());
    }

    /**
     * Silme, cerezin GIDEBILDIGI yola baglidir: tarayici bir cerezi yalniz Path'inin altindaki
     * isteklere gonderir (RFC 6265). Cerez Path=/api/sessions/{slug} iken cikis istegi
     * (/api/auth/logout) onu HIC tasimiyordu; sunucu silinecek cerezi goremedigi icin
     * {@code AuthCookies.clearParticipants} gercek tarayicida no-op'tu: cikistan sonra
     * tarayiciyi devralan kisi onceki katilimci olarak yazmaya devam edebiliyordu.
     *
     * <p>Entegrasyon testi bunu YAKALAYAMAZ (MockMvc cerez path'i uygulamaz, cerezi elle
     * ekleriz) — invaryant bu yuzden path'in kendisinde sabitlenir.
     */
    @Test
    void participantCookieReachesTheEndpointsThatClearIt() {
        AuthCookies cookies = new AuthCookies(props(true, "", List.of()));
        String path = cookies.participant("x7k2m", "pt-a", Duration.ofHours(24)).getPath();

        assertThat("/api/auth/logout").startsWith(path);
        assertThat("/api/auth/google").startsWith(path);
        assertThat("/api/sessions/x7k2m/swipes").startsWith(path);
        // Canli olay kanali /api disinda: kimlik cerezi handshake'e yine gitmez.
        assertThat("/ws").doesNotStartWith(path);
    }

    @Test
    void corsAllowsOnlyDeclaredOriginsHeadersAndCredentials() {
        CorsConfigurationSource source = new SecurityConfig()
                .corsConfigurationSource(props(true, "", List.of("https://bumpinto.app")));

        MockHttpServletRequest apiRequest = new MockHttpServletRequest("OPTIONS", "/api/sessions/x7k2m");
        CorsConfiguration config = source.getCorsConfiguration(apiRequest);

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOrigins()).containsExactly("https://bumpinto.app");
        assertThat(config.getAllowedHeaders()).containsExactly(
                "Authorization", "Content-Type", "X-Participant-Token", "X-Client");
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getAllowedOriginPatterns()).isNull(); // joker origin yok

        MockHttpServletRequest outside = new MockHttpServletRequest("GET", "/actuator/health");
        assertThat(source.getCorsConfiguration(outside)).isNull();
    }

    // --- Zincir kural matrisi: uc sozlesmesindeki public/korumali ayrimi -----------------------
    // Not: session controller'lari henuz yok; burada sabitlenen sey zincirin YETKI kurallari,
    // uclarin gövdesi degil. Izin verilen istek uygulamaya ULASIR (chain ilerler), reddedilen 401 alir.

    static final UUID SESSION_ID = UUID.randomUUID();
    static final FakeStores.InMemorySessionStore STORE = new FakeStores.InMemorySessionStore();

    static {
        STORE.saveSession(new Session(SESSION_ID, "x7k2m", UUID.randomUUID(), "Kahve",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plus(6, ChronoUnit.HOURS), null, List.of()));
        STORE.saveParticipant(new Participant(UUID.randomUUID(), SESSION_ID, "Ayse", null,
                false, null, false, null, null));
    }

    @Configuration
    static class ChainBeans {
        @Bean AppProps appProps() {
            return props(true, "", List.of("https://bumpinto.app"));
        }

        @Bean Clock clock() {
            return Clock.systemUTC();
        }

        @Bean TokenService tokenService(AppProps p, Clock c) {
            return new TokenService(p, c);
        }

        @Bean SessionStorePort sessionStore() {
            return STORE;
        }
    }

    static final AnnotationConfigWebApplicationContext CONTEXT = chainContext();

    static AnnotationConfigWebApplicationContext chainContext() {
        AnnotationConfigWebApplicationContext ctx = new AnnotationConfigWebApplicationContext();
        ctx.setServletContext(new MockServletContext());
        ctx.register(SecurityConfig.class, ChainBeans.class);
        ctx.refresh();
        return ctx;
    }

    @AfterAll
    static void closeContext() {
        CONTEXT.close();
    }

    /** Istek guvenlik zincirinden gecip uygulamaya ulasabildi mi? */
    static boolean reachesApp(MockHttpServletRequest request) throws Exception {
        Filter chain = CONTEXT.getBean("springSecurityFilterChain", Filter.class);
        MockFilterChain tail = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();
        chain.doFilter(request, response, tail);
        if (tail.getRequest() != null) {
            return true;
        }
        assertThat(response.getStatus()).isEqualTo(401);
        return false;
    }

    static MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setRequestURI(uri);
        return request;
    }

    @Test
    void publicEndpointsNeedNoCredentials() throws Exception {
        assertThat(reachesApp(request("POST", "/api/auth/google"))).isTrue();
        assertThat(reachesApp(request("POST", "/api/auth/logout"))).isTrue();
        assertThat(reachesApp(request("POST", "/api/sessions/x7k2m/participants"))).isTrue();
        assertThat(reachesApp(request("GET", "/api/sessions/x7k2m/preview"))).isTrue();
        assertThat(reachesApp(request("GET", "/v3/api-docs"))).isTrue();
        assertThat(reachesApp(request("GET", "/ws"))).isTrue();
        assertThat(reachesApp(request("GET", "/error"))).isTrue();
    }

    /**
     * Canli olay kanali da HTTP ile AYNI origin listesine baglidir. Onceden
     * setAllowedOriginPatterns("*") idi: herhangi bir sitedeki sayfa, ziyaretcinin tarayicisinda
     * /topic/session/{slug}'a abone olabiliyordu (cross-site WebSocket hijacking). Handshake
     * kimliksiz oldugu icin (cerez path'i /ws'i kapsamiyor) origin TEK tarayici tarafi savunma.
     */
    @Test
    void webSocketHandshakeIsBoundToTheConfiguredOriginAllowlist() {
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        when(registry.addEndpoint(anyString())).thenReturn(registration);

        new WebSocketConfig(props(true, "", List.of("https://bumpinto.app")))
                .registerStompEndpoints(registry);

        verify(registry).addEndpoint("/ws");
        verify(registration).setAllowedOriginPatterns("https://bumpinto.app");
    }

    /** Origin listesi bos/tanimsizsa kanal kapali kalir (fail-closed) — "*"a DUSMEZ. */
    @Test
    void webSocketHandshakeFailsClosedWhenNoOriginIsConfigured() {
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        when(registry.addEndpoint(anyString())).thenReturn(registration);

        new WebSocketConfig(props(true, "", List.of())).registerStompEndpoints(registry);

        verify(registration).setAllowedOriginPatterns();
    }

    static Message<byte[]> stompFrame(SimpMessageType type) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(type);
        accessor.setDestination("/topic/session/x7k2m");
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    /**
     * Kanal SALT OKUNUR olmali. Spring'in simple broker'i, hedefi broker onekiyle baslayan
     * ISTEMCI SEND frame'lerini de abonelere rolelemektedir: handshake kimliksiz oldugu icin
     * slug'i bilen biri /topic/session/{slug}'a sahte olay basip oturumdaki HERKESIN sekmesine
     * tam bir GET /api/sessions/{slug} yaptirabilirdi (yukseltme: 1 frame -> N agir istek,
     * ardindan herkes rate limit'e carpar). Uygulamada tek bir @MessageMapping yok; istemciden
     * gelen mesaj frame'inin hicbir mesru kullanimi da yok.
     */
    @Test
    void liveChannelDropsClientPublishedFrames() {
        ChannelRegistration registration = mock(ChannelRegistration.class);
        ArgumentCaptor<ChannelInterceptor> captor = ArgumentCaptor.forClass(ChannelInterceptor.class);
        MessageChannel channel = mock(MessageChannel.class);

        new WebSocketConfig(props(true, "", List.of("https://bumpinto.app")))
                .configureClientInboundChannel(registration);

        verify(registration).interceptors(captor.capture());
        ChannelInterceptor interceptor = captor.getValue();
        assertThat(interceptor.preSend(stompFrame(SimpMessageType.MESSAGE), channel)).isNull();
        // Abonelik ve baglanti frame'leri gecmeli, yoksa kanal hic calismaz.
        Message<byte[]> subscribe = stompFrame(SimpMessageType.SUBSCRIBE);
        assertThat(interceptor.preSend(subscribe, channel)).isSameAs(subscribe);
        Message<byte[]> connect = stompFrame(SimpMessageType.CONNECT);
        assertThat(interceptor.preSend(connect, channel)).isSameAs(connect);
    }

    @Test
    void everythingElseRequiresAuthentication() throws Exception {
        assertThat(reachesApp(request("POST", "/api/sessions"))).isFalse();
        assertThat(reachesApp(request("GET", "/api/sessions/x7k2m"))).isFalse();
        assertThat(reachesApp(request("POST", "/api/sessions/x7k2m/swipes"))).isFalse();
        assertThat(reachesApp(request("POST", "/api/sessions/x7k2m/find-venues"))).isFalse();
        assertThat(reachesApp(request("GET", "/actuator/health"))).isFalse();
    }

    /** permitAll kurallari metoda baglidir: ayni yolun baska metodu public degildir. */
    @Test
    void publicRulesAreMethodScoped() throws Exception {
        assertThat(reachesApp(request("GET", "/api/auth/google"))).isFalse();
        assertThat(reachesApp(request("GET", "/api/auth/logout"))).isFalse();
        assertThat(reachesApp(request("GET", "/api/sessions/x7k2m/participants"))).isFalse();
        assertThat(reachesApp(request("POST", "/api/sessions/x7k2m/preview"))).isFalse();
    }

    @Test
    void backendJwtOpensProtectedEndpoints() throws Exception {
        String jwt = CONTEXT.getBean(TokenService.class)
                .issueAccessToken(UUID.randomUUID(), "m@x.dev");
        MockHttpServletRequest request = request("POST", "/api/sessions");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);

        assertThat(reachesApp(request)).isTrue();
    }

    /** Katilimci filtresi zincire gercekten bagli: dogru slug gecer, baska oturumun ucu gecmez. */
    @Test
    void participantTokenIsScopedToItsOwnSessionInTheRealChain() throws Exception {
        String token = CONTEXT.getBean(TokenService.class).issueParticipantToken(
                UUID.randomUUID(), UUID.randomUUID(), "x7k2m", false, UUID.randomUUID());

        MockHttpServletRequest own = request("POST", "/api/sessions/x7k2m/swipes");
        own.addHeader(ParticipantTokenFilter.HEADER, token);
        assertThat(reachesApp(own)).isTrue();

        // Slug claim'i URL ile eslesmeyen token hicbir sey acmaz — DB'ye bakilmadan, claim'den.
        MockHttpServletRequest foreign = request("POST", "/api/sessions/q3n8p/swipes");
        foreign.addHeader(ParticipantTokenFilter.HEADER, token);
        assertThat(reachesApp(foreign)).isFalse();
    }
}
