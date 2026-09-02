package com.bumpinto.adapter.in.web;

import com.bumpinto.application.deck.DeckFlow;
import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.ParticipantTokenFilter;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.infra.security.SecurityConfig;
import com.bumpinto.infra.security.TokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {SessionController.class, ParticipantController.class, DeckController.class})
// ParticipantTokenFilter BILEREK import edilmez: bean olursa servlet zincirine de kaydolur ve
// OncePerRequestFilter'in "already filtered" isareti zincir icindeki gercek ornegi atlatir.
@Import({SecurityConfig.class, SessionViewAssembler.class, AuthCookies.class, TokenService.class,
        ParticipantTokenDelivery.class, WebSecuritySliceTest.TestBeans.class})
class WebSecuritySliceTest {

    @TestConfiguration
    static class TestBeans {

        @Bean
        AppProps appProps() {
            return new AppProps(
                    new AppProps.Security("cid", "0123456789abcdef0123456789abcdef",
                            Duration.ofHours(12)),
                    new AppProps.Providers("", ""),
                    new AppProps.Cors(List.of("http://localhost:5173")),
                    new AppProps.Cookies(false, ""),
                    new AppProps.RateLimit(false));
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired TokenService tokens;
    @Autowired RateLimitFilter rateLimit;
    @MockitoBean SessionCommands commands;
    @MockitoBean DeckFlow deckFlow;
    @MockitoBean SessionQueries queries;
    @MockitoBean SessionStorePort store;

    static final UUID SESSION_ID = UUID.randomUUID();

    // Kovalar filtre bean'inde yasar ve bu sinifin 11 testi ayni bean'i paylasir; her test
    // taze kovayla baslar. Limit KAPATILMAZ - tek test icindeki asim yine 429 doner.
    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    /** Token tasiyan DTO'lar default record toString'i ile sirri log'a sizdirirdi — maskeli. */
    @Test
    void tokenCarryingDtosMaskSecretsInToString() {
        UUID id = UUID.randomUUID();

        assertThat(new AuthController.LoginResponse("jwt-secret-value", Instant.EPOCH, id)
                .toString()).doesNotContain("jwt-secret-value").contains(id.toString());
        assertThat(new AuthController.GoogleLoginRequest("google-id-token-value").toString())
                .doesNotContain("google-id-token-value");
        assertThat(new ApiDtos.JoinResponse(id, "pt-secret-value").toString())
                .doesNotContain("pt-secret-value").contains(id.toString());
        assertThat(new ApiDtos.CreateSessionResponse("x7k2m", id, id, "pt-secret-value",
                Instant.EPOCH).toString()).doesNotContain("pt-secret-value").contains("x7k2m");
    }

    static Participant ayse() {
        return new Participant(UUID.randomUUID(), SESSION_ID, "Ayşe",
                new GeoPoint(51.3855, 5.7120), false, "tok-a", null, false, null);
    }

    static Session session(UUID hostId) {
        return new Session(SESSION_ID, "abc", hostId, null, ActivityType.COFFEE,
                SessionType.GROUP, SessionStatus.SWIPING, Instant.now().plusSeconds(600), null,
                List.of());
    }

    /** Katılımcı token'ı "abc" oturumunda geçerli olsun diye filtrenin gördüğü depoyu kurar. */
    void participantTokenIsValidForAbc() {
        when(store.sessionBySlug("abc")).thenReturn(Optional.of(session(UUID.randomUUID())));
        when(store.participantByToken("tok-a")).thenReturn(Optional.of(ayse()));
    }

    @Test
    void viewWithoutCredentialsIs401() throws Exception {
        mvc.perform(get("/api/sessions/abc")).andExpect(status().isUnauthorized());
    }

    @Test
    void webJoinPutsTokenOnlyInHttpOnlyCookie() throws Exception {
        when(commands.join(eq("abc"), eq("Ayşe"), any(), any())).thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.38,\"lng\":5.71}"))
                .andExpect(status().isCreated())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("tok-a");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(result.getResponse().getContentAsString())
                .contains("\"participantToken\":null"); // web'e token sızmaz
    }

    @Test
    void mobileJoinReturnsTokenInBodyWithoutCookie() throws Exception {
        when(commands.join(eq("abc"), eq("Ayşe"), any(), any())).thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").value("tok-a"))
                .andReturn();

        assertThat(result.getResponse().getCookie("bumpinto_pt_abc")).isNull();
    }

    @Test
    void joinRejectsOutOfRangeCoordinates() throws Exception {
        mvc.perform(post("/api/sessions/abc/participants")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\",\"lat\":999,\"lng\":5.71}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSessionWithoutAuthIs401() throws Exception {
        mvc.perform(post("/api/sessions").contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSessionAcceptsBackendBearerToken() throws Exception {
        UUID hostId = UUID.randomUUID();
        Session session = session(hostId);
        Participant host = new Participant(UUID.randomUUID(), session.id(), "M",
                new GeoPoint(51.7, 5.3), true, "tok-h", null, false, null);
        when(commands.createSession(eq(hostId), any(), any(), any(), any(), any(), any()))
                .thenReturn(new SessionCommands.CreateSessionResult(session, host));

        String bearer = tokens.issueAccessToken(hostId, "m@x.dev");
        mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + bearer)
                        .contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("abc"))
                .andExpect(jsonPath("$.participantToken").value("tok-h"));
    }

    /** Host da katılımcıdır: web'de onun token'ı da gövdeye değil cookie'ye gider. */
    @Test
    void webCreateSessionPutsHostTokenOnlyInCookie() throws Exception {
        UUID hostId = UUID.randomUUID();
        Session session = session(hostId);
        Participant host = new Participant(UUID.randomUUID(), session.id(), "M",
                new GeoPoint(51.7, 5.3), true, "tok-h", null, false, null);
        when(commands.createSession(eq(hostId), any(), any(), any(), any(), any(), any()))
                .thenReturn(new SessionCommands.CreateSessionResult(session, host));

        MvcResult result = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + tokens.issueAccessToken(hostId, "m@x.dev"))
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").doesNotExist())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("tok-h");
        assertThat(cookie.isHttpOnly()).isTrue();
    }

    /** Katılımcı token'ı kimlik doğrular ama host ucunu AÇMAZ: 403, 500 değil. */
    @Test
    void participantTokenCannotDriveHostEndpoints() throws Exception {
        participantTokenIsValidForAbc();

        mvc.perform(post("/api/sessions/abc/find-venues")
                        .header(ParticipantTokenFilter.HEADER, "tok-a"))
                .andExpect(status().isForbidden());
    }

    /** Host JWT'si katılımcı ucunu açmaz: deste eylemleri katılımcı token'ı ister. */
    @Test
    void hostJwtCannotDriveParticipantEndpoints() throws Exception {
        String bearer = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");

        mvc.perform(post("/api/sessions/abc/swipes")
                        .header("Authorization", "Bearer " + bearer)
                        .contentType("application/json")
                        .content("{\"venueId\":\"" + UUID.randomUUID() + "\",\"liked\":true}"))
                .andExpect(status().isForbidden());
    }

    /** Filtre fail-closed: katılımcı token'ı /api/sessions/{slug} dışında kimlik doğrulamaz. */
    @Test
    void participantTokenDoesNotOpenSessionCreation() throws Exception {
        participantTokenIsValidForAbc();

        mvc.perform(post("/api/sessions")
                        .header(ParticipantTokenFilter.HEADER, "tok-a")
                        .contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void participantTokenOpensItsOwnSessionView() throws Exception {
        participantTokenIsValidForAbc();
        Session session = session(UUID.randomUUID());
        when(queries.snapshot("abc")).thenReturn(new SessionQueries.SessionSnapshot(
                session, List.of(ayse()), List.of(), java.util.Map.of(), java.util.Set.of()));

        mvc.perform(get("/api/sessions/abc").header(ParticipantTokenFilter.HEADER, "tok-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("abc"))
                .andExpect(jsonPath("$.participants[0].displayName").value("Ayşe"));
    }

    /**
     * Rate limit filtresi servlet zincirinde GERCEKTEN kayitli ve kimlik dogrulamadan ONCE
     * calisiyor: find-venues butcesi (3/dk) dolunca 401 degil 429 doner.
     */
    @Test
    void rateLimitRejectsBeforeAuthenticationOnceBudgetIsSpent() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/sessions/abc/find-venues"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/sessions/abc/find-venues"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"));
    }
}
