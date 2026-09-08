package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.ParticipantTokenFilter;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * R-B9: 5 haneli oturum kodu. Kod UYEYE gorunur ({@code GET /{slug}}), koddan ONIZLEME ise
 * kamu ucudur — ve o onizleme kodu GERI VERMEZ (§2: koda karsi kod aramasi yasak).
 *
 * <p>Mock kumesi {@code ApiHappyPathTest} ile AYNI tutulur: @SpringBootTest baglami bean
 * override kumesiyle anahtarlanir, ayni kume = ayni onbellekli baglam (ikinci Postgres yok).
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
class JoinCodeApiTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @MockitoBean VenueProviderPort provider;
    @MockitoBean GoogleIdVerifier google;
    @MockitoBean ReverseGeocodePort geocoder;
    @MockitoBean com.bumpinto.domain.port.GeocodePort forwardGeocoder;

    private static final String JSON = "application/json";

    private String hostToken;

    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    @Test
    void ownerSeesTheJoinCodeAndAnonymousCanResolveItToAPreview() throws Exception {
        String slug = createSession();
        String code = mvc.perform(get("/api/sessions/" + slug).with(hostAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinCode").isString())
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"joinCode\":\"([A-Z0-9]{5})\".*", "$1");

        mvc.perform(get("/api/sessions/by-code/" + code.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(slug))
                .andExpect(jsonPath("$.joinCode").doesNotExist());
    }

    @Test
    void malformedOrUnknownCodesAre404() throws Exception {
        mvc.perform(get("/api/sessions/by-code/X7K2I")).andExpect(status().isNotFound());
        mvc.perform(get("/api/sessions/by-code/ABC")).andExpect(status().isNotFound());
        mvc.perform(get("/api/sessions/by-code/ZZZZZ")).andExpect(status().isNotFound());
    }

    /** Host oturum kurar; katilimci token'i {@link #hostAuth()} icin alanda saklanir. */
    private String createSession() throws Exception {
        String idToken = "gid-code-" + java.util.UUID.randomUUID();
        org.mockito.Mockito.when(google.verify(idToken)).thenReturn(
                new GoogleIdVerifier.GoogleUser(idToken + "@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        var created = json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"name\":\"Kod testi\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        hostToken = created.get("participantToken").asString();
        return created.get("slug").asString();
    }

    /** Oturum icinde kimlik TEK turdur: katilimci token'i (host da bir katilimcidir). */
    private RequestPostProcessor hostAuth() {
        return request -> {
            request.addHeader(ParticipantTokenFilter.HEADER, hostToken);
            return request;
        };
    }
}
