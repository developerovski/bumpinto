package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.application.user.AccountIdentity;
import com.bumpinto.application.user.RefreshTokens;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.infra.security.AppleIdVerifier;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.infra.security.SecurityConfig;
import com.bumpinto.infra.security.TokenService;
import com.bumpinto.support.TestProps;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/auth/google'in HATA yolu. Dogrulayici zincirinin kendisi GoogleIdVerifierTest'te;
 * burada sinanan, reddin web katmaninda hangi statuye dondugu.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, AuthCookies.class, TokenService.class,
        AuthControllerTest.TestBeans.class})
class AuthControllerTest {

    @TestConfiguration
    static class TestBeans {

        @Bean
        AppProps appProps() {
            return TestProps.defaults();
        }

        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-09-02T17:00:00Z"), ZoneOffset.UTC);
        }
    }

    static final String BODY = "{\"idToken\":\"whatever\"}";

    @Autowired MockMvc mvc;
    @Autowired RateLimitFilter rateLimit;

    /**
     * Giris ucunun butcesi 5/dk ve kova SINIF BOYUNCA paylasilir: yenileme testleri eklenince
     * altinci giris 429 alip alakasiz bir testi dusurdu. Her test taze kovayla baslar.
     */
    @BeforeEach
    void resetRateLimits() {
        rateLimit.reset();
    }

    @MockitoBean GoogleIdVerifier google;
    @MockitoBean AppleIdVerifier apple;
    @MockitoBean AccountIdentity identity;
    @MockitoBean UserStorePort users;
    /** SecurityConfig.apiChain'in katilimci filtresi icin istedigi depo — bu testte kullanilmaz. */
    @MockitoBean SessionStorePort store;
    @MockitoBean RefreshTokens refreshTokens;

    /** Apple ayarli degilse uc VAR ama 503 doner: istemci "Apple ile devam et"i gizleyebilsin. */
    @Test
    void unconfiguredAppleIs503() throws Exception {
        when(apple.configured()).thenReturn(false);

        mvc.perform(post("/api/auth/apple").contentType("application/json")
                        .content("{\"identityToken\":\"whatever\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("apple_not_configured"));
    }

    /**
     * Suresi dolmus/baska audience'a basilmis id_token 500 dondurUyordu: JwtException hicbir
     * handler'a eslenmemisti. Kullanici hatasi 401'dir; 500 hem istemciyi yaniltir hem de
     * her basarisiz giris denemesini sunucu arizasi gibi loglar.
     */
    @Test
    void rejectedIdTokenIs401() throws Exception {
        when(google.verify(any())).thenThrow(new BadJwtException("Jwt expired at ..."));

        mvc.perform(post("/api/auth/google").contentType("application/json").content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("invalid_token"));
    }

    /** Govde dogrulayicinin metnini tasimamali: hangi kontrolun kaldigi saldirgana ipucudur. */
    @Test
    void rejectionBodyLeaksNoVerifierDetail() throws Exception {
        when(google.verify(any())).thenThrow(new JwtException("audience mismatch"));

        mvc.perform(post("/api/auth/google").contentType("application/json").content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("invalid_token"));
    }

    /** Bos idToken @NotBlank'e takilir — dogrulayiciya hic gitmez. */
    @Test
    void blankIdTokenIs400() throws Exception {
        mvc.perform(post("/api/auth/google").contentType("application/json")
                        .content("{\"idToken\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    /** Mutlu yol regresyon citasi: web istemcisi token'i govdede degil cerezde alir. */
    @Test
    void webClientGetsCookieNotBodyToken() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(eq("m@x.dev"), eq("Mehmet"))).thenReturn(userId);
        when(refreshTokens.issue(any(), any()))
                .thenReturn(new RefreshTokens.Issued("rt", Instant.parse("2026-10-09T17:00:00Z")));

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("bumpinto_at"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.userId").value(userId.toString()));
    }

    static final Instant EXPIRES = Instant.parse("2026-10-09T17:00:00Z");

    /** Web: yenileme jetonu GOVDEDE gitmez, AYRI HttpOnly cerezde gider. */
    @Test
    void webLoginSetsARefreshCookieAndNoBodyToken() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(eq(userId), eq("web")))
                .thenReturn(new RefreshTokens.Issued("rt-web", EXPIRES));

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(cookie().value(AuthCookies.REFRESH, "rt-web"))
                .andExpect(cookie().httpOnly(AuthCookies.REFRESH, true))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    /**
     * Cerezin yolu CIKISI KAPSAMALI: RFC 6265 geregi cerez yalniz Path'inin altindaki
     * isteklerde gonderilir. `/api/auth/refresh` yazilsaydi `/api/auth/logout` istegi onu hic
     * tasimaz, sunucu ne okuyabilir ne silebilirdi — cikan kullanicinin yenileme jetonu hem
     * tarayicida hem DB'de canli kalirdi. Bu dosya ayni hatayi katilimci cerezinde yasadi.
     */
    @Test
    void refreshCookiePathCoversLogout() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(any(), any()))
                .thenReturn(new RefreshTokens.Issued("rt-web", EXPIRES));

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(cookie().path(AuthCookies.REFRESH, "/api/auth"));
    }

    /** Mobil: cerez yok, iki jeton da GOVDEDE. */
    @Test
    void mobileLoginReturnsBothTokensInTheBody() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(eq(userId), eq("mobile")))
                .thenReturn(new RefreshTokens.Issued("rt-mobile", EXPIRES));

        mvc.perform(post("/api/auth/google").contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").value("rt-mobile"));
    }

    /** Mobil yenileme: govdedeki jeton donduruldu, YENISI govdede doner. */
    @Test
    void mobileRefreshRotatesAndReturnsNewTokens() throws Exception {
        UUID userId = UUID.randomUUID();
        when(refreshTokens.rotate(eq("rt-old"), eq("mobile")))
                .thenReturn(Optional.of(new RefreshTokens.Rotation(userId, "rt-new", EXPIRES)));
        when(users.profileOf(userId)).thenReturn(Optional.of(
                new UserProfile(userId, "m@x.dev", "Mehmet", null, null, null, "tr")));

        mvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"rt-old\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").value("rt-new"));
    }

    /** Web yenileme: cerezden okunur, IKI cerez birden tazelenir, govde jeton tasimaz. */
    @Test
    void webRefreshReadsTheCookieAndRotatesBothCookies() throws Exception {
        UUID userId = UUID.randomUUID();
        when(refreshTokens.rotate(eq("rt-old"), eq("web")))
                .thenReturn(Optional.of(new RefreshTokens.Rotation(userId, "rt-new", EXPIRES)));
        when(users.profileOf(userId)).thenReturn(Optional.of(
                new UserProfile(userId, "m@x.dev", "Mehmet", null, null, null, "tr")));

        mvc.perform(post("/api/auth/refresh").header("X-Client", "web")
                        .cookie(new Cookie(AuthCookies.REFRESH, "rt-old")))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(AuthCookies.ACCESS))
                .andExpect(cookie().value(AuthCookies.REFRESH, "rt-new"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    /** Reddedilen yenileme 401: istemci kesicisi tam bu koda bakip cikisa duser. */
    @Test
    void rejectedRefreshIs401() throws Exception {
        when(refreshTokens.rotate(any(), any())).thenReturn(Optional.empty());

        mvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"calinmis\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("invalid_refresh_token"));
    }

    /** Hic jeton sunulmadan yenileme: 401. Anonim tarayici sessizce oturum acamaz. */
    @Test
    void refreshWithoutATokenIs401() throws Exception {
        when(refreshTokens.rotate(any(), any())).thenReturn(Optional.empty());

        mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }

    /** Silinmis hesap yeniden jeton alamaz: rotasyon gecse bile profil yoksa 401. */
    @Test
    void refreshForADeletedAccountIs401() throws Exception {
        UUID userId = UUID.randomUUID();
        when(refreshTokens.rotate(any(), any()))
                .thenReturn(Optional.of(new RefreshTokens.Rotation(userId, "rt-new", EXPIRES)));
        when(users.profileOf(userId)).thenReturn(Optional.empty());

        mvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"rt-old\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** Cikis: sunulan jetonun AILESI kapanir ve yenileme cerezi silinir. */
    @Test
    void logoutRevokesTheFamilyAndClearsTheRefreshCookie() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(new Cookie(AuthCookies.REFRESH, "rt-web")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(AuthCookies.REFRESH, 0));

        verify(refreshTokens).revokeFamilyOf("rt-web");
    }

    /** Mobil cikisi jetonu GOVDEDE gonderir (cerez yok) — iptal yine de olur. */
    @Test
    void mobileLogoutRevokesTheFamilyFromTheBody() throws Exception {
        mvc.perform(post("/api/auth/logout").contentType("application/json")
                        .content("{\"refreshToken\":\"rt-mobile\"}"))
                .andExpect(status().isNoContent());

        verify(refreshTokens).revokeFamilyOf("rt-mobile");
    }
}
