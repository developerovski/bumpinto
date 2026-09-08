package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.application.user.AccountIdentity;
import com.bumpinto.infra.security.AppleIdVerifier;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.SecurityConfig;
import com.bumpinto.infra.security.TokenService;
import com.bumpinto.support.TestProps;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    @MockitoBean GoogleIdVerifier google;
    @MockitoBean AppleIdVerifier apple;
    @MockitoBean AccountIdentity identity;
    @MockitoBean UserStorePort users;
    /** SecurityConfig.apiChain'in katilimci filtresi icin istedigi depo — bu testte kullanilmaz. */
    @MockitoBean SessionStorePort store;

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

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("bumpinto_at"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.userId").value(userId.toString()));
    }
}
