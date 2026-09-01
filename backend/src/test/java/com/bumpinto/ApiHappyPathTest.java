package com.bumpinto;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.ParticipantTokenFilter;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.support.PostgresContainer;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tüm uygulama context'i + gerçek Postgres üzerinden spec §7 akışı:
 * create → join → find-venues → swipe → decide. Dış dünya YOK: Google doğrulayıcı ve mekan
 * sağlayıcısı taklit edilir; ağa çıkan bir entegrasyon testi kırılgandır ve CI'da yalan söyler.
 */
@SpringBootTest
@AutoConfigureMockMvc
// Ayarlar profile değil teste bağlanır: suite SPRING_PROFILES_ACTIVE'den bağımsız çalışır.
// Değerler bilerek sahtedir — gerçek sır teste girmez.
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.providers.foursquare-key=test-only-fsq-key",
        "bumpinto.providers.google-key=test-only-google-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
class ApiHappyPathTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @MockitoBean VenueProviderPort provider;   // @Primary ResilientVenueProvider yerine
    @MockitoBean GoogleIdVerifier google;      // dış Google çağrısı yok

    private static final String JSON = "application/json";

    // Rate limit filtresi bu baglamda da zincirde; kovalar bean'de yasar ve @SpringBootTest
    // baglamlari siniflar arasi paylasilir. Her test taze kovayla baslar (limit kapatilmaz).
    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    @Test
    void createJoinSuggestSwipeDecide() throws Exception {
        when(google.verify("gid"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("e2e@bumpinto.test", "Mehmet"));
        when(provider.search(any(), anyDouble(), any(), anyInt())).thenReturn(
                IntStream.range(0, 6).mapToObj(i -> new VenueCandidate("foursquare", "f" + i,
                        "Mekan " + i, new GeoPoint(51.54 + i * 0.001, 5.5),
                        4.9 - i * 0.1, 2, null, "https://maps/" + i)).toList());

        // 0 — mobil giriş: Google id_token → backend access token (body'de)
        String loginBody = mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = json.readTree(loginBody).get("accessToken").asString();
        assertThat(accessToken).isNotBlank();

        // 1 — host oturum kurar (Bearer; mobil istemci → participantToken body'de)
        String createBody = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"name\":\"Cuma kahvesi\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(createBody);
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();
        assertThat(hostToken).isNotBlank();

        // 2 — Ayşe WEB istemcisi olarak katılır: token HttpOnly cookie'de, body'de null
        MvcResult joinResult = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}"))
                .andExpect(status().isCreated())
                .andReturn();
        assertThat(json.readTree(joinResult.getResponse().getContentAsString())
                .get("participantToken").isNull()).isTrue();
        Cookie ayseCookie = joinResult.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(ayseCookie).isNotNull();
        assertThat(ayseCookie.isHttpOnly()).isTrue();

        // 3 — host desteyi kurar
        String viewBody = mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(viewBody);
        assertThat(view.get("status").asString()).isEqualTo("SWIPING");
        assertThat(view.get("venues").size()).isEqualTo(6);
        String favoriteId = view.get("venues").get(0).get("id").asString();

        // 4 — host header token'ıyla, Ayşe cookie'yle aynı mekanı beğenir + desteyi bitirir
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .header(ParticipantTokenFilter.HEADER, hostToken)
                        .contentType(JSON)
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done")
                        .header(ParticipantTokenFilter.HEADER, hostToken))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .cookie(ayseCookie)
                        .contentType(JSON)
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done").cookie(ayseCookie))
                .andExpect(status().isOk());

        // 5 — kesişim tek mekan → doğrudan karar (spec §4)
        String finalBody = mvc.perform(get("/api/sessions/" + slug).cookie(ayseCookie))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode finalView = json.readTree(finalBody);
        assertThat(finalView.get("status").asString()).isEqualTo("DECIDED");
        assertThat(finalView.get("decidedVenueId").asString()).isEqualTo(favoriteId);

        // 6 — web giriş: access token da body'de değil HttpOnly cookie'de gelir ve host ucunu açar
        MvcResult webLogin = mvc.perform(post("/api/auth/google")
                        .header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid\"}"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(json.readTree(webLogin.getResponse().getContentAsString())
                .get("accessToken").isNull()).isTrue();
        Cookie accessCookie = webLogin.getResponse().getCookie("bumpinto_at");
        assertThat(accessCookie).isNotNull();
        assertThat(accessCookie.isHttpOnly()).isTrue();

        String otherSlug = json.readTree(mvc.perform(post("/api/sessions")
                        .cookie(accessCookie)
                        .contentType(JSON)
                        .content("{\"activityType\":\"BAR\",\"lat\":51.44,\"lng\":5.47,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();

        // 7 — katılımcı token'ı yalnızca kendi oturumunun yollarında çalışır
        mvc.perform(get("/api/sessions/" + otherSlug)
                        .header(ParticipantTokenFilter.HEADER, ayseCookie.getValue()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/sessions/" + otherSlug).cookie(ayseCookie))
                .andExpect(status().isUnauthorized());

        // 8 — OpenAPI codegen ucu açık
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }
}
