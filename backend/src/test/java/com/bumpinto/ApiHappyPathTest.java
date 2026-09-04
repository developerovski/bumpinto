package com.bumpinto;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.ReverseGeocodePort;
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

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
    // Mockito varsayilan yaniti Optional donen metotlarda Optional.empty() — gercek Nominatim
    // adapteri baglamda kalsaydi find-venues her cagrida aga cikardi (yasak: gercek ag cagrisi).
    @MockitoBean ReverseGeocodePort geocoder;

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

        // 3 — host desteyi kurar: onceki BROWSING ("Mekanlar"), herkes harita+listede gorur
        String viewBody = mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(viewBody);
        assertThat(view.get("status").asString()).isEqualTo("BROWSING");
        assertThat(view.get("sessionType").asString()).isEqualTo("GROUP");
        assertThat(view.get("venues").size()).isEqualTo(6);
        JsonNode firstVenue = view.get("venues").get(0);
        assertThat(firstVenue.get("provider").asString()).isEqualTo("foursquare");
        assertThat(firstVenue.get("mapsUrl").isNull()).isFalse();
        assertThat(firstVenue.get("fairness").get("maxMinutes").asInt()).isPositive();
        assertThat(view.get("midpoint").get("lat").asDouble()).isBetween(51.38, 51.70);
        assertThat(view.get("radiusKm").asDouble()).isBetween(1.0, 10.0);
        // katilimci konumu 2 ondalikla doner (yaklasik ~1 km) — tam koordinat sizmaz
        assertThat(view.get("participants").get(1).get("approxLocation").get("lat").asDouble())
                .isEqualTo(51.39);

        // 3b — host karistirir ve kaydirmayi acar
        String shuffledBody = mvc.perform(post("/api/sessions/" + slug + "/shuffle")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode shuffled = json.readTree(shuffledBody);
        assertThat(shuffled.get("status").asString()).isEqualTo("SWIPING");
        String favoriteId = shuffled.get("venues").get(0).get("id").asString();

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

    /**
     * Host'un elinde SADECE hesap kimligi var: katilimci cerezi yok. Gercekte olan buydu —
     * katilimci token'i yalnizca oturum kurulurken bir kez cereze yazilir, host oturumu baska
     * bir tarayicida ("Oturumlar" listesinden) actiginda o cerez yoktur ve bir daha dagitilmaz.
     * Onceden GET calisiyor, her yazma 403 "participant token required" donuyordu: host
     * kaydiriyor, hicbir swipe kaydedilmiyor, ekran "Deste bitti" diyordu (sessiz veri kaybi).
     */
    @Test
    void hostWithOnlyAnAccountTokenCanSwipeAndFinishTheDeck() throws Exception {
        when(google.verify("gid3"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("nocookie@bumpinto.test", "Mehmet"));
        when(provider.search(any(), anyDouble(), any(), anyInt())).thenReturn(
                IntStream.range(0, 6).mapToObj(i -> new VenueCandidate("foursquare", "n" + i,
                        "Mekan " + i, new GeoPoint(51.54 + i * 0.001, 5.5),
                        4.9 - i * 0.1, 2, null, "https://maps/n" + i)).toList());

        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid3\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        // Host WEB olarak kurar; katilimci cerezini BILEREK atariz — baska bir tarayici.
        String slug = json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.6978,\"lng\":5.3037,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();

        Cookie ayseCookie = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getCookie("bumpinto_pt_" + slug);

        mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        String favoriteId = json.readTree(mvc.perform(post("/api/sessions/" + slug + "/shuffle")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString())
                .get("venues").get(0).get("id").asString();

        // Sadece hesap token'iyla: kaydir, geri al, tekrar kaydir, desteyi bitir.
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/sessions/" + slug + "/swipes/" + favoriteId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Swipe GERCEKTEN kaydedildi: Ayşe de ayni mekani begenince karar cikar.
        assertThat(json.readTree(mvc.perform(get("/api/sessions/" + slug)
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn().getResponse().getContentAsString())
                .get("participants").get(0).get("deckDone").asBoolean()).isTrue();

        mvc.perform(post("/api/sessions/" + slug + "/swipes").cookie(ayseCookie)
                        .contentType(JSON)
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done").cookie(ayseCookie))
                .andExpect(status().isOk());

        String decidedBody = mvc.perform(get("/api/sessions/" + slug)
                        .cookie(ayseCookie))
                .andReturn().getResponse().getContentAsString();
        JsonNode decided = json.readTree(decidedBody);
        assertThat(decided.get("status").asString()).isEqualTo("DECIDED");
        assertThat(decided.get("decidedVenueId").asString()).isEqualTo(favoriteId);
        assertThat(decided.get("decisionKind").asString()).isEqualTo("UNANIMOUS");
        assertThat(decided.get("decidedAt").isTextual()).isTrue(); // ISO-8601 dizgi
        assertThat(decided.get("likeCounts").size()).isGreaterThan(0);
        assertThat(decidedBody).doesNotContain("runoffVotes");
    }

    @Test
    void soloSessionPicksFromMapWithoutDeck() throws Exception {
        when(google.verify("gid2"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("solo@bumpinto.test", "Mehmet"));
        when(provider.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(
                new VenueCandidate("foursquare", "f1", "Café Berlage", new GeoPoint(51.44, 5.47),
                        4.6, 2, null, "https://maps/1")));
        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid2\"}"))
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        String slug = json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"sessionType\":\"SOLO\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\","
                                + "\"locationLabel\":\"'s-Hertogenbosch\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();

        // katilim SOLO'da kapali
        mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .contentType(JSON).content("{\"displayName\":\"Ayşe\"}"))
                .andExpect(status().isConflict());

        // elle konum
        String pointBody = mvc.perform(post("/api/sessions/" + slug + "/points")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"locationLabel\":\"Someren\","
                                + "\"lat\":51.3855,\"lng\":5.7120,\"travelMode\":\"BIKE\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(pointBody).get("manual").asBoolean()).isTrue();
        assertThat(json.readTree(pointBody).get("travelMode").asString()).isEqualTo("BIKE");

        String browsing = mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(browsing);
        assertThat(view.get("status").asString()).isEqualTo("BROWSING");
        String venueId = view.get("venues").get(0).get("id").asString();

        mvc.perform(post("/api/sessions/" + slug + "/shuffle")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict());

        String decided = mvc.perform(post("/api/sessions/" + slug + "/force-decision")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON).content("{\"venueId\":\"" + venueId + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(decided).get("status").asString()).isEqualTo("DECIDED");
        assertThat(json.readTree(decided).get("decidedVenueId").asString()).isEqualTo(venueId);
        assertThat(json.readTree(decided).get("decisionKind").asString()).isEqualTo("FORCED");
    }

    /**
     * Davetli de Google ile girmis olabilir; o zaman tarayicisinda IKI cerez birden bulunur:
     * hesap cerezi (bumpinto_at) ve katilimci cerezi (bumpinto_pt_{slug}). Gercekte olan buydu:
     * bearer filtresi katilimci principal'ini eziyor, yazma tarafi JWT'yi gorup host
     * eslestirmesine dusuyor ve davetli host olmadigi icin her yazma 403 "participant token
     * required" donuyordu — iki kisi ayni oturumda birbirini goremiyordu (2026-09-03).
     */
    @Test
    void signedInGuestWritesAsThemselvesNotAsTheHost() throws Exception {
        when(google.verify("gid-host"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("gh@bumpinto.test", "Mehmet"));
        when(google.verify("gid-guest"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("gg@bumpinto.test", "Ayşe"));

        Cookie hostAccount = webLogin("gid-host");
        String slug = json.readTree(mvc.perform(post("/api/sessions")
                        .cookie(hostAccount).header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.6978,\"lng\":5.3037,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();

        Cookie guestAccount = webLogin("gid-guest");
        MvcResult joined = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .cookie(guestAccount).header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}"))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie guestParticipant = joined.getResponse().getCookie("bumpinto_pt_" + slug);
        String guestId = json.readTree(joined.getResponse().getContentAsString())
                .get("participantId").asString();

        // Katilimci cerezi + hesap cerezi ayni istekte: dar kimlik kazanmali.
        mvc.perform(put("/api/sessions/" + slug + "/location")
                        .cookie(guestAccount, guestParticipant)
                        .contentType(JSON)
                        .content("{\"lat\":51.4000,\"lng\":5.6000,\"travelMode\":\"BIKE\"}"))
                .andExpect(status().isOk());

        // Yazma davetlinin KENDI satirina gitti; host'un satiri yerinde.
        mvc.perform(get("/api/sessions/" + slug).cookie(guestAccount, guestParticipant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewer.participantId").value(guestId))
                .andExpect(jsonPath("$.viewer.host").value(false))
                .andExpect(jsonPath("$.participants.length()").value(2));

        // Ve davetli host ucunu acamaz: dar kimlik yetki genisletmez.
        mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .cookie(guestAccount, guestParticipant))
                .andExpect(status().isForbidden());
    }

    /** Web girisi: HttpOnly bumpinto_at cerezi. */
    private Cookie webLogin(String idToken) throws Exception {
        return mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("bumpinto_at");
    }
}
