package com.bumpinto.adapter.in.web;

import com.bumpinto.application.deck.DeckFlow;
import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.PresencePort;
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
import com.jayway.jsonpath.JsonPath;
import org.springframework.security.oauth2.jwt.Jwt;
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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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
        ParticipantTokenDelivery.class,
        WebSecuritySliceTest.TestBeans.class})
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
                    new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000, 5000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
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
    @MockitoBean UserProfileQueries profiles;
    // SessionViewAssembler artik PresencePort ister; bu paket InMemoryPresence'i taramaz.
    @MockitoBean PresencePort presence;

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

    static final UUID AYSE_ID = UUID.randomUUID();

    static Participant ayse() {
        return new Participant(AYSE_ID, SESSION_ID, "Ayşe",
                new GeoPoint(51.3855, 5.7120), false, null, false, null, null);
    }

    static Session session(UUID hostId) {
        return new Session(SESSION_ID, "abc", hostId, null, List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.SWIPING, Instant.now().plusSeconds(600), null,
                List.of());
    }

    /**
     * "abc" oturumu için geçerli bir katılımcı token'ı üretir. Filtre artık DB'ye BAKMAZ:
     * kimlik token'ın imzasından ve claim'lerinden çıkar, o yüzden depo kurulumuna gerek yok.
     */
    String participantTokenForAbc() {
        return tokens.issueParticipantToken(AYSE_ID, SESSION_ID, "abc", false);
    }

    @Test
    void viewWithoutCredentialsIs401() throws Exception {
        mvc.perform(get("/api/sessions/abc")).andExpect(status().isUnauthorized());
    }

    @Test
    void webJoinPutsTokenOnlyInHttpOnlyCookie() throws Exception {
        when(commands.join(eq("abc"), any(), eq("Ayşe"), any(), any(), any()))
                .thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.38,\"lng\":5.71}"))
                .andExpect(status().isCreated())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        // Cerezdeki deger, KATILAN katilimciya ve BU oturuma baglı imzalı bir token olmalı.
        Jwt delivered = tokens.decoder().decode(cookie.getValue());
        assertThat(delivered.getSubject()).isEqualTo(AYSE_ID.toString());
        assertThat(delivered.getClaimAsString(TokenService.SLUG_CLAIM)).isEqualTo("abc");
        assertThat(delivered.getClaimAsString(TokenService.TYPE_CLAIM))
                .isEqualTo(TokenService.PARTICIPANT_TYPE);
        assertThat(result.getResponse().getContentAsString())
                .contains("\"participantToken\":null"); // web'e token sızmaz
    }

    @Test
    void mobileJoinReturnsTokenInBodyWithoutCookie() throws Exception {
        when(commands.join(eq("abc"), any(), eq("Ayşe"), any(), any(), any()))
                .thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").isNotEmpty())
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
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSessionAcceptsBackendBearerToken() throws Exception {
        UUID hostId = UUID.randomUUID();
        Session session = session(hostId);
        Participant host = new Participant(UUID.randomUUID(), session.id(), "M",
                new GeoPoint(51.7, 5.3), true, null, false, null, null);
        when(commands.createSession(eq(hostId), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new SessionCommands.CreateSessionResult(session, host));

        String bearer = tokens.issueAccessToken(hostId, "m@x.dev");
        MvcResult created = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + bearer)
                        .contentType("application/json")
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("abc"))
                .andExpect(jsonPath("$.participantToken").isNotEmpty())
                .andReturn();

        // Govdedeki deger host katilimcisina ve bu oturuma bagli imzali bir token olmali.
        String body = created.getResponse().getContentAsString();
        Jwt delivered = tokens.decoder().decode(JsonPath.read(body, "$.participantToken"));
        assertThat(delivered.getSubject()).isEqualTo(host.id().toString());
        assertThat(delivered.getClaimAsBoolean(TokenService.HOST_CLAIM)).isTrue();
    }

    /** Host da katılımcıdır: web'de onun token'ı da gövdeye değil cookie'ye gider. */
    @Test
    void webCreateSessionPutsHostTokenOnlyInCookie() throws Exception {
        UUID hostId = UUID.randomUUID();
        Session session = session(hostId);
        Participant host = new Participant(UUID.randomUUID(), session.id(), "M",
                new GeoPoint(51.7, 5.3), true, null, false, null, null);
        when(commands.createSession(eq(hostId), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new SessionCommands.CreateSessionResult(session, host));

        MvcResult result = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + tokens.issueAccessToken(hostId, "m@x.dev"))
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").doesNotExist())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        Jwt delivered = tokens.decoder().decode(cookie.getValue());
        assertThat(delivered.getSubject()).isEqualTo(host.id().toString());
        assertThat(delivered.getClaimAsBoolean(TokenService.HOST_CLAIM)).isTrue();
    }

    /**
     * Oda ICINDE hesap token'i tek basina HICBIR SEY surmez — host ucu dahil. Web katmaninin
     * garantisi budur; "bu katilimci host mu" sorusu artik burada degil, koltugu DB'den okuyan
     * uygulama katmanindadir (bkz. DeckFlowTest#onlyTheHostSeatCanDriveHostActions).
     */
    @Test
    void anAccountTokenAloneDrivesNothingInsideTheRoom() throws Exception {
        String bearer = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");

        mvc.perform(post("/api/sessions/abc/find-venues")
                        .header("Authorization", "Bearer " + bearer))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/sessions/abc/swipes")
                        .header("Authorization", "Bearer " + bearer)
                        .contentType("application/json")
                        .content("{\"venueId\":\"" + UUID.randomUUID() + "\",\"liked\":true}"))
                .andExpect(status().isForbidden());
    }

    /**
     * Hesabin oda ici kimligi KOLTUK SAHIPLIGINDEN cozulur (participants.user_id) ve cerez ayni
     * yanitta yeniden yazilir: katilimci cerezi olmayan bir tarayicida uye kendi satirini gorur
     * ve bir sonraki yazmasi calisir. Host'a ozel bir dal degildir — davetli uye de ayni yoldan
     * doner, yoksa kendi oturumunun katilim formuna duserdi.
     */
    @Test
    void anAccountResolvesToItsOwnSeatOnReadAndGetsItsCookieBack() throws Exception {
        UUID guestAccount = UUID.randomUUID();
        Participant seat = new Participant(AYSE_ID, SESSION_ID, "Ayşe",
                new GeoPoint(51.3855, 5.7120), false, null, false, null, null, guestAccount);
        when(queries.snapshot("abc")).thenReturn(new SessionQueries.SessionSnapshot(
                session(UUID.randomUUID()), List.of(seat), List.of(), Map.of(), Map.of(), Map.of()));

        MvcResult result = mvc.perform(get("/api/sessions/abc")
                        .header("Authorization",
                                "Bearer " + tokens.issueAccessToken(guestAccount, "a@x.dev"))
                        .header("X-Client", "web"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewer.participantId").value(AYSE_ID.toString()))
                .andReturn();

        Cookie repaired = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(repaired).isNotNull();
        assertThat(tokens.decoder().decode(repaired.getValue()).getSubject())
                .isEqualTo(AYSE_ID.toString());
    }

    /**
     * Hesabin koltugu tarayicida kalmis bir katilimci cerezini YENER ve cerez ayni yanitta
     * duzeltilir. Uye kendi oturumunun linkini giris yapmadigi bir tarayicida acip ANONIM
     * katilmis olabilir; o cerez hesap kimligini ezseydi oturumun sahibi kendi oturumunda 24
     * saat misafir kalirdi (A5 incelemesi, 2026-09-04).
     */
    @Test
    void theAccountSeatBeatsAStaleParticipantCookieAndRepairsIt() throws Exception {
        UUID ownerAccount = UUID.randomUUID();
        UUID ownerSeatId = UUID.randomUUID();
        Participant ownerSeat = new Participant(ownerSeatId, SESSION_ID, "Mehmet",
                new GeoPoint(51.7, 5.3), true, null, false, null, null, ownerAccount);
        when(queries.snapshot("abc")).thenReturn(new SessionQueries.SessionSnapshot(
                session(ownerAccount), List.of(ownerSeat, ayse()), List.of(),
                Map.of(), Map.of(), Map.of()));

        MvcResult result = mvc.perform(get("/api/sessions/abc")
                        .header("Authorization",
                                "Bearer " + tokens.issueAccessToken(ownerAccount, "m@x.dev"))
                        .header("X-Client", "web")
                        .cookie(new Cookie("bumpinto_pt_abc", participantTokenForAbc())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewer.participantId").value(ownerSeatId.toString()))
                .andExpect(jsonPath("$.viewer.host").value(true))
                .andReturn();

        Cookie repaired = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(repaired).isNotNull();
        assertThat(tokens.decoder().decode(repaired.getValue()).getSubject())
                .isEqualTo(ownerSeatId.toString());
    }

    /** Filtre fail-closed: katılımcı token'ı /api/sessions/{slug} dışında kimlik doğrulamaz. */
    @Test
    void participantTokenDoesNotOpenSessionCreation() throws Exception {
        String participantToken = participantTokenForAbc();
        String body = "{\"activityTypes\":[\"COFFEE\"],\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}";

        mvc.perform(post("/api/sessions")
                        .header(ParticipantTokenFilter.HEADER, participantToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());

        // Ayni sir iki tur token'i da imzaliyor: katilimci token'i HESAP kimligi olarak da
        // sunulabilir. typ=pt kapisi olmasa bir davetlinin oturum token'i "oturum kur" ucunu
        // acardi (SecurityConfig.apiJwtDecoder).
        mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + participantToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/sessions")
                        .cookie(new Cookie(AuthCookies.ACCESS, participantToken))
                        .contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void participantTokenOpensItsOwnSessionView() throws Exception {
        Session session = session(UUID.randomUUID());
        when(queries.snapshot("abc")).thenReturn(new SessionQueries.SessionSnapshot(
                session, List.of(ayse()), List.of(), java.util.Map.of(), java.util.Map.of(),
                java.util.Map.of()));

        mvc.perform(get("/api/sessions/abc")
                        .header(ParticipantTokenFilter.HEADER, participantTokenForAbc()))
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
