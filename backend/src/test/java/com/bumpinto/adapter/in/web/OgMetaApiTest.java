package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.infra.security.GoogleIdVerifier;
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
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * R-B10: {@code /j/{slug}} sayfasinin OG/Twitter etiketlerini besleyen KAMU ucu. Etiketler
 * HTML'e web izinde basilir (W-15); backend yalniz veriyi verir. URL'ler MUTLAK olmali —
 * onizleme sunuculari goreli bir {@code og:image}'i cozemez ve gorsel hic gorunmezdi.
 *
 * <p>Mock kumesi {@code ApiHappyPathTest}/{@code JoinCodeApiTest} ile AYNI tutulur:
 * @SpringBootTest baglami bean override kumesiyle anahtarlanir, ayni kume = ayni onbellekli
 * baglam (ucuncu bir Postgres kalkmaz).
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
class OgMetaApiTest {

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

    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    /**
     * Govde KIMLIKSIZ okunur ve sadece bes alandan ibarettir: koordinat, katilimci id'si ya da
     * mekan sizarsa link'i eline gecen herkes onlari gorurdu (spec §8).
     */
    @Test
    void metaCarriesTheAbsoluteImageAndInviteUrls() throws Exception {
        String slug = createSession();
        mvc.perform(get("/api/sessions/" + slug + "/og"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").value(startsWith("http")))
                .andExpect(jsonPath("$.imageUrl").value(endsWith("/og/" + slug + ".png")))
                .andExpect(jsonPath("$.url").value(startsWith("http")))
                .andExpect(jsonPath("$.url").value(endsWith("/j/" + slug)))
                .andExpect(jsonPath("$.expired").value(false))
                .andExpect(jsonPath("$.title").isString())
                .andExpect(jsonPath("$.description").isString())
                .andExpect(jsonPath("$.*", hasSize(5)));
    }

    @Test
    void unknownSlugStillReturnsGenericMetaNot404() throws Exception {
        mvc.perform(get("/api/sessions/zzzzzzzz/og"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expired").value(true));
    }

    /** Host oturum kurar; meta ucu kamu oldugu icin donen token'a ihtiyac yoktur. */
    private String createSession() throws Exception {
        String idToken = "gid-ogmeta-" + java.util.UUID.randomUUID();
        org.mockito.Mockito.when(google.verify(idToken)).thenReturn(
                new GoogleIdVerifier.GoogleUser(idToken + "@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        return json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"name\":\"Meta testi\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();
    }
}
