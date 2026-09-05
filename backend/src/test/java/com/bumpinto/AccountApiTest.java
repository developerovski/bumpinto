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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
                            .content("{\"activityTypes\":[\"COFFEE\"],\"sessionType\":\"" + type + "\","
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
                                + "\"defaultActivity\":\"BAR\",\"defaultTravelMode\":\"BIKE\","
                                + "\"defaultLocation\":{\"lat\":51.69,\"lng\":5.30,\"label\":\"Den Bosch\"}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(updated.get("displayName").asString()).isEqualTo("Mehmet Ş.");
        assertThat(updated.get("language").asString()).isEqualTo("nl");
        assertThat(updated.get("defaultLocation").get("label").asString()).isEqualTo("Den Bosch");
        assertThat(updated.get("defaultTravelMode").asString()).isEqualTo("BIKE");

        mvc.perform(put("/api/me").cookie(at).contentType(JSON).content("{\"language\":\"de\"}"))
                .andExpect(status().isBadRequest());

        // PUT tam degistirir: gonderilmeyen tercih temizlenir, displayName null = degismez
        JsonNode cleared = json.readTree(mvc.perform(put("/api/me").cookie(at).contentType(JSON)
                        .content("{\"language\":\"en\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(cleared.get("displayName").asString()).isEqualTo("Mehmet Ş.");
        assertThat(cleared.get("defaultLocation").isNull()).isTrue();
        assertThat(cleared.get("defaultActivity").isNull()).isTrue();
        assertThat(cleared.get("defaultTravelMode").isNull()).isTrue();

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
                        .content("{\"activityTypes\":[\"COFFEE\"],\"name\":\"Önizleme\",\"lat\":51.69,\"lng\":5.30,"
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

        // Baska bir hesabin JWT'si: uye DEGIL -> okuma tamamen kapali (403).
        // Onceden 200 + viewer:null donuyordu: slug'i bilen HERHANGI bir hesap, katilmadan
        // katilimci listesini ve yaklasik konumlari okuyabiliyordu. Katilmamis birine acik olan
        // tek sey public onizlemedir (koordinat/id tasimaz).
        Cookie otherAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid6\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        mvc.perform(get("/api/sessions/" + slug).cookie(otherAt))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/sessions/" + slug + "/preview").cookie(otherAt))
                .andExpect(status().isOk());
    }

    /**
     * Uyenin kimligi yeni bir tarayicida ONARILIR ve host kendi oturumuna MISAFIR olarak giremez.
     *
     * <p>Onceden kimlik yalniz istemcideki katilimci cerezinde yasiyordu: cerezi olmayan bir
     * tarayicida (yeni cihaz, temizlenmis cerez) host katilim formuna dusuyor ve kendi oturumunda
     * ikinci bir koltuk aciyordu. Katilim ucu de cagirani hic sormuyordu. Hayalet koltuk kendi
     * konumuyla orta noktayi ve deste geometrisini bozar.
     */
    @Test
    void theHostRecoversItsSeatInsteadOfTakingASecondOne() throws Exception {
        when(google.verify("gid-seat"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("seat@bumpinto.test", "Mehmet"));
        Cookie hostAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-seat\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        JsonNode created = json.readTree(mvc.perform(post("/api/sessions").cookie(hostAt)
                        .header("X-Client", "web").contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.69,\"lng\":5.30,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String slug = created.get("slug").asString();
        String hostParticipantId = created.get("participantId").asString();

        // Yeni tarayici: yalniz hesap cerezi var. Okuma calisir VE katilimci cerezi yeniden yazilir.
        Cookie repaired = mvc.perform(get("/api/sessions/" + slug).cookie(hostAt)
                        .header("X-Client", "web"))
                .andExpect(status().isOk()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(repaired).isNotNull();
        assertThat(repaired.getValue()).isNotBlank();
        assertThat(repaired.getPath()).isEqualTo("/api");

        // Yine de katilim ucuna giderse ayni koltugu alir: ikinci satir acilmaz.
        JsonNode rejoined = json.readTree(mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .cookie(hostAt).header("X-Client", "web").contentType(JSON)
                        .content("{\"displayName\":\"Sahte Misafir\",\"lat\":51.1,\"lng\":5.1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        assertThat(rejoined.get("participantId").asString()).isEqualTo(hostParticipantId);

        JsonNode after = json.readTree(mvc.perform(get("/api/sessions/" + slug).cookie(hostAt))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(after.get("participants")).hasSize(1);
        assertThat(after.get("participants").get(0).get("displayName").asString())
                .isEqualTo("Mehmet");
    }

    /**
     * Uye kendi oturumuna ANONIM katilabilir: giris yapmadigi bir tarayicida kendi linkini
     * acinca katilim formunu gorur ve o tarayiciya YANLIS koltugu gosteren bir cerez yazilir.
     * Sonradan giris yapmak onu temizlemez (onceki hesap cerezi yok -> signedInAsSomeoneElse
     * false). A5 incelemesi bu tuzagi buldu: cerez hesap kimligini ezdiginde oturumun sahibi
     * kendi oturumunda 24 saat misafir kaliyordu — okuma "host degilsin" diyor, host uclari
     * 403 donuyordu ve hicbir sey onarmiyordu.
     */
    @Test
    void theOwnerIsNotTrappedByItsOwnAnonymousSeat() throws Exception {
        when(google.verify("gid-trap"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("trap@bumpinto.test", "Mehmet"));
        Cookie hostAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-trap\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        JsonNode created = json.readTree(mvc.perform(post("/api/sessions").cookie(hostAt)
                        .header("X-Client", "web").contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.69,\"lng\":5.30,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String slug = created.get("slug").asString();
        String hostParticipantId = created.get("participantId").asString();

        // Giris yapmamis ikinci tarayici: kendi linkine ANONIM katilir -> hayalet koltuk + cerez.
        Cookie ghost = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web").contentType(JSON)
                        .content("{\"displayName\":\"Mehmet\",\"lat\":51.1,\"lng\":5.1}"))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(ghost).isNotNull();

        // O tarayicida host eylemi hayalet koltukla REDDEDILIR: tuzak gercek.
        mvc.perform(post("/api/sessions/" + slug + "/shuffle").cookie(ghost))
                .andExpect(status().isForbidden());

        // Ayni tarayicida giris yapilir. Okuma hesabin koltugunu secer ve cerezi ONARIR.
        MvcResult view = mvc.perform(get("/api/sessions/" + slug).cookie(hostAt, ghost)
                        .header("X-Client", "web"))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = json.readTree(view.getResponse().getContentAsString());
        assertThat(body.get("viewer").get("participantId").asString()).isEqualTo(hostParticipantId);
        assertThat(body.get("viewer").get("host").asBoolean()).isTrue();
        Cookie repaired = view.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(repaired).isNotNull();
        assertThat(repaired.getValue()).isNotEqualTo(ghost.getValue());

        // Onarilan cerezle host yetkisi geri gelir: 403 degil, "yanlis durum" (409).
        mvc.perform(post("/api/sessions/" + slug + "/shuffle").cookie(repaired))
                .andExpect(status().isConflict());
    }

    /**
     * Anonim katilip SONRA giris yapan davetli, koltugunu IKINCI CIHAZDA da bulur (K-B23).
     * Giris katilimci cerezini temizlemez (bilincli: "kisi once katilip sonra giris yapmis
     * olabilir"), ama koltuk sahipsiz kaldigi surece hesap onu goremiyordu: ikinci cihazda
     * yeniden katilir ve mukerrer satir acardi (orta noktayi ceker).
     */
    @Test
    void anAnonymousSeatBecomesTheAccountsSeatAfterSigningIn() throws Exception {
        when(google.verify("gid-claim-host"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("claimhost@bumpinto.test", "Mehmet"));
        when(google.verify("gid-claim-guest"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("claimguest@bumpinto.test", "Ayşe"));
        Cookie hostAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-claim-host\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        String slug = json.readTree(mvc.perform(post("/api/sessions").cookie(hostAt)
                        .header("X-Client", "web").contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.69,\"lng\":5.30,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString())
                .get("slug").asString();

        // Davetli GIRIS YAPMADAN katilir: koltugun sahibi yok.
        MvcResult joined = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web").contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.38,\"lng\":5.71}"))
                .andExpect(status().isCreated()).andReturn();
        String seatId = json.readTree(joined.getResponse().getContentAsString())
                .get("participantId").asString();
        Cookie seatCookie = joined.getResponse().getCookie("bumpinto_pt_" + slug);

        // Ayni tarayicida SONRADAN giris yapar ve oturumu okur: koltuk hesaba baglanir.
        Cookie guestAt = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-claim-guest\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");
        mvc.perform(get("/api/sessions/" + slug).cookie(guestAt, seatCookie)
                        .header("X-Client", "web"))
                .andExpect(status().isOk());

        // IKINCI CIHAZ: yalniz hesap cerezi. Ayni koltuk bulunur ve cerez basilir.
        MvcResult second = mvc.perform(get("/api/sessions/" + slug).cookie(guestAt)
                        .header("X-Client", "web"))
                .andExpect(status().isOk()).andReturn();
        assertThat(json.readTree(second.getResponse().getContentAsString())
                .get("viewer").get("participantId").asString()).isEqualTo(seatId);
        assertThat(second.getResponse().getCookie("bumpinto_pt_" + slug)).isNotNull();

        // Ve oturumda hâlâ iki kisi var: mukerrer satir acilmadi.
        assertThat(json.readTree(second.getResponse().getContentAsString())
                .get("participants")).hasSize(2);
    }

    @Test
    void meRoundTripsDefaultTravelMode() throws Exception {
        when(google.verify("gid-travel"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("travel@bumpinto.test", "Mehmet"));
        JsonNode login = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid-travel\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String token = login.get("accessToken").asString();

        mvc.perform(put("/api/me").header("Authorization", "Bearer " + token)
                        .contentType(JSON).content("{\"defaultTravelMode\":\"EBIKE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultTravelMode").value("EBIKE"));
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.defaultTravelMode").value("EBIKE"));
    }

    /**
     * Katilimci cerezi hesaba degil TARAYICIYA yazilir: cikista ve hesap degisiminde
     * temizlenmezse bir sonraki kullaniciya devreder. Gercekte olan buydu — oturumu kuran
     * host'un katilimci token'i, ayni tarayicida baska bir Google hesabina gecildikten sonra
     * da duruyordu; o tarayici host adina yaziyor, davetli kendi kimligini hic edinemiyordu
     * (2026-09-03).
     */
    @Test
    void participantCookiesDoNotOutliveTheAccountSession() throws Exception {
        when(google.verify("gid7"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("first7@bumpinto.test", "Mehmet"));
        when(google.verify("gid8"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("second8@bumpinto.test", "Ayşe"));

        Cookie firstAt = webLogin("gid7");
        MvcResult created = mvc.perform(post("/api/sessions")
                        .cookie(firstAt).header("X-Client", "web").contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.69,\"lng\":5.30,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn();
        String slug = json.readTree(created.getResponse().getContentAsString()).get("slug").asString();
        Cookie participant = created.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(participant).isNotNull();

        // AYNI hesapla tekrar giris: katilimciligi bozmaz.
        MvcResult again = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .cookie(firstAt, participant)
                        .contentType(JSON).content("{\"idToken\":\"gid7\"}"))
                .andExpect(status().isOk()).andReturn();
        assertThat(again.getResponse().getCookie("bumpinto_pt_" + slug)).isNull();

        // BASKA hesaba gecis: devralinan katilimci cerezi silinir.
        Cookie switched = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .cookie(firstAt, participant)
                        .contentType(JSON).content("{\"idToken\":\"gid8\"}"))
                .andExpect(status().isOk()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(switched).isNotNull();
        assertThat(switched.getMaxAge()).isZero();
        // Silme yazarkenki YOLLA yapilmali; yol /api'dir cunku cerezin cikis/giris ucuna
        // ulasabilmesi gerekir (bkz. SecurityPolicyTest.participantCookieReachesTheEndpointsThatClearIt).
        assertThat(switched.getPath()).isEqualTo("/api");

        // Cikis da temizler: tarayici artik "ben" degil.
        Cookie afterLogout = mvc.perform(post("/api/auth/logout").cookie(firstAt, participant))
                .andExpect(status().isNoContent()).andReturn().getResponse()
                .getCookie("bumpinto_pt_" + slug);
        assertThat(afterLogout).isNotNull();
        assertThat(afterLogout.getMaxAge()).isZero();
    }

    /** Web girisi: HttpOnly bumpinto_at cerezi. */
    private Cookie webLogin(String idToken) throws Exception {
        return mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("bumpinto_at");
    }

    /**
     * ILK cerez degil, GECERLI cerez kazanir. Katilimci cerezinin yolu bir kez
     * /api/sessions/{slug} -> /api olarak genisletildi; tarayici cerezi (ad, domain, PATH) ile
     * sakladigi icin eski yola yazilmis olan silinmedi ve RFC 6265 daha spesifik path'i ONE
     * koyuyor. "Ilk eslesen" tam olarak BAYAT olandi: host kendi oturumunda "participant token
     * required" (403) aliyordu ve durum kendiliginden duzelmiyordu (silme yalniz yeni yola
     * yaziliyordu, eskisine ulasamiyordu).
     */
    @Test
    void aStaleDuplicateParticipantCookieDoesNotShadowTheValidOne() throws Exception {
        when(google.verify("gid-dup"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("dup@bumpinto.test", "Mehmet"));
        Cookie at = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-dup\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie("bumpinto_at");

        MvcResult created = mvc.perform(post("/api/sessions").cookie(at).header("X-Client", "web")
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"lat\":51.6978,\"lng\":5.3037,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated()).andReturn();
        String slug = json.readTree(created.getResponse().getContentAsString()).get("slug").asString();
        Cookie valid = created.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(valid).isNotNull();

        // Tarayicinin gonderdigi sira: once eski yoldaki bayat token, sonra gecerli olan.
        Cookie stale = new Cookie("bumpinto_pt_" + slug, "qgC5gPSUhBHatZmJV88pvlRBjWReHszearsRWICg1gA");
        mvc.perform(get("/api/sessions/" + slug).cookie(stale, valid).header("X-Client", "web"))
                .andExpect(status().isOk());
        // Yazma ucu: 403 "participant token required" YOK — bayat cerez gecerlisini golgelemiyor.
        mvc.perform(put("/api/sessions/" + slug + "/location").cookie(stale, valid)
                        .contentType(JSON)
                        .content("{\"lat\":51.6978,\"lng\":5.3037,\"label\":\"Den Bosch\"}"))
                .andExpect(status().isOk());

        // Cikis IKI yola birden silme yazar; yoksa eski yoldaki cerez erisilmez kalirdi.
        MvcResult logout = mvc.perform(post("/api/auth/logout").cookie(at, stale))
                .andExpect(status().isNoContent()).andReturn();
        assertThat(logout.getResponse().getCookies())
                .filteredOn(c -> ("bumpinto_pt_" + slug).equals(c.getName()))
                .extracting(Cookie::getPath)
                .containsExactlyInAnyOrder("/api", "/api/sessions/" + slug);
    }
}
