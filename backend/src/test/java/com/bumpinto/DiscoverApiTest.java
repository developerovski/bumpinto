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
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B-17 uctan uca: acik plan kur → Kesfet'te gor → istek at → onayla → koltuk → check-in.
 *
 * <p>Sizinti testi de burada: onaylanmamis kullanici {@code SessionView} goremez ve Kesfet
 * karti kesin konum tasimaz.
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
class DiscoverApiTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @MockitoBean VenueProviderPort provider;
    @MockitoBean GoogleIdVerifier google;

    private static final String JSON = "application/json";
    /**
     * Bulusma 2 gun sonra: Kesfet penceresi 14 GUN (DiscoverQueries.WINDOW) ve oturum TTL'i
     * bulusma + 3 saat. Sabit bir tarih yazilamaz — biri gecmiste kalir, digeri pencerenin
     * disina duser; ikisi de listeyi sessizce bosaltir.
     */
    private static final String MEET_AT = java.time.Instant.now()
            .plus(java.time.Duration.ofDays(2)).toString();

    @BeforeEach
    void freshRateLimitBuckets() {
        rateLimit.reset();
    }

    private Cookie login(String idToken, String email, String name) throws Exception {
        when(google.verify(idToken))
                .thenReturn(new GoogleIdVerifier.GoogleUser(email, name));
        return mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
    }

    @Test
    void openPlanFlowFromDiscoverToCheckin() throws Exception {
        Cookie ayse = login("gid-op-host", "ayse-op@bumpinto.test", "Ayşe");
        Cookie priya = login("gid-op-guest", "priya-op@bumpinto.test", "Priya");

        // 1) Ayse acik plan kurar.
        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("HIKE"), "displayName", "Ayşe",
                "name", "Genneper yürüyüşü", "lat", 51.44, "lng", 5.47,
                "locationLabel", "Stratum", "travelMode", "BIKE",
                "openPlan", Map.of("meetAt", MEET_AT, "capacity", 4, "joinPolicy", "APPROVAL")));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(ayse)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        // 2) Kesfet KIMLIK ister; Priya kendi konumuyla dakika alir.
        mvc.perform(get("/api/discover")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/discover").cookie(priya).param("activity", "HIKE")
                        .param("lat", "51.45").param("lng", "5.48").param("travelMode", "BIKE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[0].slug").value(slug))
                .andExpect(jsonPath("$.plans[0].approvedSeats").value(1))
                .andExpect(jsonPath("$.plans[0].confirmed").value(false))
                .andExpect(jsonPath("$.plans[0].minutes").isNumber())
                // Kart KESIN konum tasimaz: koordinat alani yok.
                .andExpect(jsonPath("$.plans[0].lat").doesNotExist())
                .andExpect(jsonPath("$.plans[0].lng").doesNotExist());

        // 3) Priya istek atar. Onizleme acik plani tasir; SessionView HALA 403.
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(priya)
                        .contentType(JSON).content(json.writeValueAsString(Map.of(
                                "displayName", "Priya", "lat", 51.45, "lng", 5.48,
                                "travelMode", "BIKE", "note", "Yeni geldim"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.openPlan.capacity").value(4));
        mvc.perform(get("/api/sessions/" + slug).cookie(priya))
                .andExpect(status().isForbidden());

        // 4) Host listeler ve onaylar (HESAP kimligi — ARCHITECTURE §8'in bilincli istisnasi).
        String reqId = json.readTree(mvc.perform(get("/api/sessions/" + slug + "/seat-requests")
                        .cookie(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.requests[0].displayName").value("Priya"))
                .andExpect(jsonPath("$.requests[0].note").value("Yeni geldim"))
                .andReturn().getResponse().getContentAsString())
                .get("requests").get(0).get("id").asString();
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests/" + reqId + "/approve")
                        .cookie(ayse)).andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedSeats").value(2))
                .andExpect(jsonPath("$.confirmed").value(false));

        // 5) Priya koltugunu alir: web'de cerez duser, sonra SessionView'i gorur.
        MvcResult mine = mvc.perform(get("/api/sessions/" + slug + "/seat-requests/mine")
                        .cookie(priya).header("X-Client", "web"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                // Web'de token GOVDEDE donmez, cereze yazilir.
                .andExpect(jsonPath("$.participantToken").doesNotExist())
                .andReturn();
        Cookie seat = mine.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(seat).isNotNull();
        mvc.perform(get("/api/sessions/" + slug).cookie(priya, seat))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openPlan.approvedSeats").value(2));

        // 6) Bulusma gecmeden check-in 409: erken cevap olcum degil niyet olurdu.
        mvc.perform(post("/api/sessions/" + slug + "/checkin").cookie(priya, seat)
                        .contentType(JSON).content("{\"met\":true}"))
                .andExpect(status().isConflict());
    }

    /** Dolu plan Kesfet'te GORUNMEZ ve ikinci istek 409 doner. */
    @Test
    void aSecondRequestFromTheSameUserIsRejected() throws Exception {
        Cookie host = login("gid-op2-host", "host2-op@bumpinto.test", "Host");
        Cookie guest = login("gid-op2-guest", "guest2-op@bumpinto.test", "Guest");

        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                "lat", 51.44, "lng", 5.47, "travelMode", "CAR",
                "openPlan", Map.of("meetAt", MEET_AT)));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        String ask = json.writeValueAsString(Map.of("displayName", "Guest"));
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(guest)
                .contentType(JSON).content(ask)).andExpect(status().isCreated());
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(guest)
                .contentType(JSON).content(ask)).andExpect(status().isConflict());
    }

    /** Kapasite/politika verilmezse varsayilan 4 / APPROVAL — uc katman ayni sayiyi soyler. */
    @Test
    void openPlanDefaultsToFourSeatsAndApproval() throws Exception {
        Cookie host = login("gid-op3-host", "host3-op@bumpinto.test", "Host");

        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                "lat", 51.44, "lng", 5.47, "openPlan", Map.of("meetAt", MEET_AT)));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.openPlan.capacity").value(4))
                .andExpect(jsonPath("$.openPlan.joinPolicy").value("APPROVAL"))
                .andExpect(jsonPath("$.openPlan.meetPassed").value(false));
    }

    /** Gizli oturum Kesfet'te YOK ve seat-request ucundan 404 doner (varligi sizmaz). */
    @Test
    void aHiddenSessionIsInvisibleToDiscover() throws Exception {
        Cookie host = login("gid-op4-host", "host4-op@bumpinto.test", "Host");
        Cookie guest = login("gid-op4-guest", "guest4-op@bumpinto.test", "Guest");

        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                "lat", 51.44, "lng", 5.47));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        mvc.perform(get("/api/discover").cookie(guest)).andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[?(@.slug == '" + slug + "')]").isEmpty());
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(guest)
                        .contentType(JSON)
                        .content(json.writeValueAsString(Map.of("displayName", "Guest"))))
                .andExpect(status().isNotFound());
        // Onizleme de acik plan tasimaz.
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.openPlan").doesNotExist());
    }

    /**
     * K-B37 (2026-09-11 guvenlik incelemesi): Kesfet slug'i herkese basar; davet-linki ucu
     * (POST /participants, PUBLIC) host onayini, engeli ve kapasiteyi bilmiyordu — slug'i
     * Kesfet'ten okuyan herkes 201 + katilimci jetonu alip SessionView'i okuyabiliyordu.
     * Simdi 409 + makine kodu; oda kapali kalir. Onayli uye ise ayni uctan koltugunu geri alir
     * (mobil token onarimi) ve koltuk sayisi degismez.
     */
    @Test
    void aSlugTakenFromDiscoverDoesNotOpenASeatThroughTheInviteLink() throws Exception {
        Cookie host = login("gid-op5-host", "host5-op@bumpinto.test", "Host");
        Cookie stranger = login("gid-op5-stranger", "stranger5-op@bumpinto.test", "Yabancı");
        Cookie priya = login("gid-op5-guest", "guest5-op@bumpinto.test", "Priya");

        String body = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                "lat", 51.44, "lng", 5.47, "openPlan", Map.of("meetAt", MEET_AT)));
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString()).get("slug").asString();

        // Slug Kesfet'ten okunur — kart onu basar, gizli degildir.
        mvc.perform(get("/api/discover").cookie(stranger).param("activity", "COFFEE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[?(@.slug == '" + slug + "')]").isNotEmpty());

        // Konum YOK: yayilim kapisi calismaz, tek kapi acik plan kapisidir.
        String join = "{\"displayName\":\"Yabancı\"}";
        mvc.perform(post("/api/sessions/" + slug + "/participants").cookie(stranger)
                        .header("X-Client", "web").contentType(JSON).content(join))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("open_plan_seat_request_required"));
        // Uc PUBLIC: anonim cagiran da ayni cevabi alir.
        mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web").contentType(JSON).content(join))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("open_plan_seat_request_required"));
        // Oda KAPALI kaldi, koltuk acilmadi.
        mvc.perform(get("/api/sessions/" + slug).cookie(stranger))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.participantCount").value(1));

        // Onayli uye: istek → onay → davet-linki ucundan kurtarma (mobil) 201 + jeton.
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(priya)
                        .contentType(JSON).content("{\"displayName\":\"Priya\"}"))
                .andExpect(status().isCreated());
        String reqId = json.readTree(mvc.perform(get("/api/sessions/" + slug + "/seat-requests")
                        .cookie(host)).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString()).get("requests").get(0).get("id").asString();
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests/" + reqId + "/approve")
                .cookie(host)).andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/participants").cookie(priya)
                        .header("X-Client", "mobile").contentType(JSON)
                        .content("{\"displayName\":\"Priya\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").isString());
        mvc.perform(get("/api/sessions/" + slug + "/preview"))
                .andExpect(jsonPath("$.participantCount").value(2)); // kurtarma katilim degildir
    }

    /**
     * K-B37 yan bulgusu: seat-request uclari /api/sessions/{slug}/ altinda yasar ve
     * ParticipantTokenFilter o yolu eslestirir — kendi planinin katilimci cerezini tasiyan host
     * (gercek tarayici onu HER ZAMAN tasir; MockMvc tasimadigi icin gorulmemisti) hesap
     * principal'ini kaybediyor ve panelinden 403 aliyordu. Hesap details'ten okunur. Fail-closed
     * KORUNUR: yalniz katilimci cerezi tasiyan istek yine 403.
     */
    @Test
    void theHostPanelWorksWhileTheHostCarriesItsOwnParticipantCookie() throws Exception {
        Cookie host = login("gid-op6-host", "host6-op@bumpinto.test", "Host");
        Cookie guest = login("gid-op6-guest", "guest6-op@bumpinto.test", "Guest");

        MvcResult created = mvc.perform(post("/api/sessions").cookie(host)
                        .header("X-Client", "web").contentType(JSON)
                        .content(json.writeValueAsString(Map.of(
                                "activityTypes", List.of("COFFEE"), "displayName", "Host",
                                "lat", 51.44, "lng", 5.47,
                                "openPlan", Map.of("meetAt", MEET_AT)))))
                .andExpect(status().isCreated()).andReturn();
        String slug = json.readTree(created.getResponse().getContentAsString())
                .get("slug").asString();
        Cookie hostSeat = created.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(hostSeat).isNotNull();

        mvc.perform(post("/api/sessions/" + slug + "/seat-requests").cookie(guest)
                        .contentType(JSON).content("{\"displayName\":\"Guest\"}"))
                .andExpect(status().isCreated());

        // Hesap + katilimci cerezi BIRLIKTE (gercek tarayici): panel acik, karar calisir.
        String reqId = json.readTree(mvc.perform(get("/api/sessions/" + slug + "/seat-requests")
                        .cookie(host, hostSeat)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString())
                .get("requests").get(0).get("id").asString();
        mvc.perform(post("/api/sessions/" + slug + "/seat-requests/" + reqId + "/approve")
                        .cookie(host, hostSeat))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedSeats").value(2));

        // Onaylanan misafir de /mine'i ikinci kez (artik cerezli) cagirabilir.
        Cookie guestSeat = mvc.perform(get("/api/sessions/" + slug + "/seat-requests/mine")
                        .cookie(guest).header("X-Client", "web"))
                .andExpect(status().isOk()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(guestSeat).isNotNull();
        mvc.perform(get("/api/sessions/" + slug + "/seat-requests/mine")
                        .cookie(guest, guestSeat).header("X-Client", "web"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // YALNIZ katilimci cerezi: hesap yok → 403. Kapi gevsemedi.
        mvc.perform(get("/api/sessions/" + slug + "/seat-requests").cookie(hostSeat))
                .andExpect(status().isForbidden());
    }

    /** Katilim istegi ucu anonim cagirana KAPALI. */
    @Test
    void seatRequestsRequireAnAccount() throws Exception {
        mvc.perform(post("/api/sessions/abc12345/seat-requests").contentType(JSON)
                        .content("{\"displayName\":\"X\"}"))
                .andExpect(status().isUnauthorized());
    }
}
