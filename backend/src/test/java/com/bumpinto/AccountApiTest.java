package com.bumpinto;

import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.infra.security.GoogleIdVerifier;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Spec §6/§9: hesap listesi, profil tercihleri ve web cikisi — ApiHappyPathTest'le ayni baglami paylasir. */
@SpringBootTest
@AutoConfigureMockMvc
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
class AccountApiTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @MockitoBean VenueProviderPort provider;   // @Primary ResilientVenueProvider yerine
    @MockitoBean GoogleIdVerifier google;      // dış Google çağrısı yok

    private static final String JSON = "application/json";

    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    @Test
    void listMeUpdateAndLogout() throws Exception {
        when(google.verify("gid3"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("acct@bumpinto.test", "Mehmet"));
        MvcResult login = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid3\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie at = login.getResponse().getCookie("bumpinto_at");

        for (String type : List.of("GROUP", "SOLO")) {
            mvc.perform(post("/api/sessions").cookie(at).contentType(JSON)
                            .content("{\"activityType\":\"COFFEE\",\"sessionType\":\"" + type + "\","
                                    + "\"name\":\"" + type + " kahve\",\"lat\":51.69,\"lng\":5.30,"
                                    + "\"displayName\":\"Mehmet\"}"))
                    .andExpect(status().isCreated());
        }

        JsonNode list = json.readTree(mvc.perform(get("/api/sessions").cookie(at))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(list.get("open").size()).isEqualTo(2);
        assertThat(list.get("past").size()).isZero();
        JsonNode newest = list.get("open").get(0);
        assertThat(newest.get("name").asString()).isEqualTo("SOLO kahve"); // en yeni once
        assertThat(newest.get("participantCount").asInt()).isEqualTo(1);
        assertThat(newest.get("readyCount").asInt()).isEqualTo(1);
        assertThat(newest.get("doneCount").asInt()).isZero();
        assertThat(newest.get("decidedVenueName").isNull()).isTrue();

        JsonNode me = json.readTree(mvc.perform(get("/api/me").cookie(at))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(me.get("email").asString()).isEqualTo("acct@bumpinto.test");
        assertThat(me.get("language").isNull()).isTrue();
        assertThat(me.get("defaultLocation").isNull()).isTrue();
        assertThat(me.get("stats").get("sessionsHosted").asLong()).isEqualTo(2);
        assertThat(me.get("stats").get("friendsMet").asLong()).isZero();

        JsonNode updated = json.readTree(mvc.perform(put("/api/me").cookie(at).contentType(JSON)
                        .content("{\"displayName\":\"Mehmet Ş.\",\"language\":\"nl\","
                                + "\"defaultActivity\":\"BAR\","
                                + "\"defaultLocation\":{\"lat\":51.69,\"lng\":5.30,\"label\":\"Den Bosch\"}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(updated.get("displayName").asString()).isEqualTo("Mehmet Ş.");
        assertThat(updated.get("language").asString()).isEqualTo("nl");
        assertThat(updated.get("defaultLocation").get("label").asString()).isEqualTo("Den Bosch");

        mvc.perform(put("/api/me").cookie(at).contentType(JSON).content("{\"language\":\"de\"}"))
                .andExpect(status().isBadRequest());

        // PUT tam degistirir: gonderilmeyen tercih temizlenir, displayName null = degismez
        JsonNode cleared = json.readTree(mvc.perform(put("/api/me").cookie(at).contentType(JSON)
                        .content("{\"language\":\"en\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(cleared.get("displayName").asString()).isEqualTo("Mehmet Ş.");
        assertThat(cleared.get("defaultLocation").isNull()).isTrue();
        assertThat(cleared.get("defaultActivity").isNull()).isTrue();

        MvcResult logout = mvc.perform(post("/api/auth/logout").cookie(at))
                .andExpect(status().isNoContent()).andReturn();
        Cookie clearedCookie = logout.getResponse().getCookie("bumpinto_at");
        assertThat(clearedCookie).isNotNull();
        assertThat(clearedCookie.getMaxAge()).isZero();
        assertThat(clearedCookie.getPath()).isEqualTo("/api"); // silmenin isi gormesi icin ayni yol sart

        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/sessions")).andExpect(status().isUnauthorized());

        // stale/gecersiz cerezle bile public uclar 401'lememeli
        MvcResult staleLogout = mvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie("bumpinto_at", "stale-garbage")))
                .andExpect(status().isNoContent()).andReturn();
        assertThat(staleLogout.getResponse().getCookie("bumpinto_at").getMaxAge()).isZero();

        mvc.perform(post("/api/auth/google").cookie(new Cookie("bumpinto_at", "stale-garbage"))
                        .header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid3\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void previewIsPublicAndViewerTellsWhoIAm() throws Exception {
        when(google.verify("gid5"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("host5@bumpinto.test", "Mehmet"));
        when(google.verify("gid6"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("other6@bumpinto.test", "Ayşe"));
        Cookie hostAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid5\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        JsonNode created = json.readTree(mvc.perform(post("/api/sessions").cookie(hostAt).contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"name\":\"Önizleme\",\"lat\":51.69,\"lng\":5.30,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String slug = created.get("slug").asString();
        String hostParticipantId = created.get("participantId").asString();

        // kimliksiz onizleme: ad + hazirlik var, koordinat / id / mekan yok
        String body = mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode preview = json.readTree(body);
        assertThat(preview.get("hostDisplayName").asString()).isEqualTo("Mehmet");
        assertThat(preview.get("participantCount").asInt()).isEqualTo(1);
        assertThat(preview.get("participants").get(0).get("displayName").asString()).isEqualTo("Mehmet");
        assertThat(preview.get("participants").get(0).get("host").asBoolean()).isTrue();
        assertThat(preview.get("participants").get(0).get("hasLocation").asBoolean()).isTrue();
        assertThat(body).doesNotContain("\"lat\"").doesNotContain("\"participantId\"")
                .doesNotContain("\"venues\"").doesNotContain("\"id\"");

        // bayat host cerezi ve bayat katilimci cerezi kamu ucu engellemez
        mvc.perform(get("/api/sessions/" + slug + "/preview")
                        .cookie(new Cookie("bumpinto_at", "stale-garbage"),
                                new Cookie("bumpinto_pt_" + slug, "stale-garbage")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .cookie(new Cookie("bumpinto_at", "stale-garbage")).contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.50,\"lng\":5.40}"))
                .andExpect(status().isCreated());

        // katilimci: kendi satirini gorur
        JsonNode joined = json.readTree(mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .contentType(JSON).content("{\"displayName\":\"Kerem\",\"lat\":51.44,\"lng\":5.47}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        JsonNode asGuest = json.readTree(mvc.perform(get("/api/sessions/" + slug)
                        .header("X-Participant-Token", joined.get("participantToken").asString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(asGuest.get("viewer").get("participantId").asString())
                .isEqualTo(joined.get("participantId").asString());
        assertThat(asGuest.get("viewer").get("host").asBoolean()).isFalse();

        // host JWT: host satiri
        JsonNode asHost = json.readTree(mvc.perform(get("/api/sessions/" + slug).cookie(hostAt))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(asHost.get("viewer").get("participantId").asString()).isEqualTo(hostParticipantId);
        assertThat(asHost.get("viewer").get("host").asBoolean()).isTrue();

        // baska bir host'un JWT'si: uye degil -> viewer null
        Cookie otherAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid6\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        JsonNode asOther = json.readTree(mvc.perform(get("/api/sessions/" + slug).cookie(otherAt))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(asOther.get("viewer").isNull()).isTrue();
    }
}
