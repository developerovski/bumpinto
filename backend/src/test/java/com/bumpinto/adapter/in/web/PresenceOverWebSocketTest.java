package com.bumpinto.adapter.in.web;

import com.bumpinto.adapter.out.presence.InMemoryPresence;
import com.bumpinto.domain.port.PresencePort;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import java.time.Clock;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.ParticipantTokenFilter;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

/**
 * KANIT TESTI (2026-09-04): PresenceListener'in gercek bir STOMP istemcisiyle hic testi yoktu —
 * mockli bir {@code Message} yalniz Spring'in kendi sarmalayici davranisini dogrulardi, gercek
 * kopan seyi degil. Gercekte {@code SessionConnectedEvent.getMessage()} brokerin CONNECT_ACK'idir
 * ve o mesaj hicbir zaman {@code simpSessionAttributes} tasimaz (dogrulandi: spring-messaging
 * 7.0.8 bytecode — SimpleBrokerMessageHandler yalniz sessionId/user/heartbeat basar); yani
 * {@code arrived()} uretimde HIC cagrilmiyordu, {@code presentIn} hep bostu, her shuffle 409
 * donuyordu ve herkes ekranda "cevrimdisi" gorunuyordu.
 *
 * <p>Testcontainers/mock kurulumu {@link com.bumpinto.ApiHappyPathTest} ile AYNI kaynaktan
 * gelir (tek gercek: {@link PostgresContainer#shared()}) — gercek Postgres, sahte Google/mekan
 * saglayicisi, gercek Spring context, ama bu kez gercek bir WebSocket baglantisi.
 *
 * <p>HTTP tarafi icin TestRestTemplate/WebClient DEGIL, JDK'nin kendi HttpClient'i kullanilir:
 * bu backend RestTemplate/WebFlux'a hic bagimli degil (cikis HTTP'si unirest-java-core ile
 * yapilir) ve Boot 4.1'de TestRestTemplate {@code spring-boot-restclient} modulunu (RestTemplateBuilder)
 * ister — o modul burada yok, eklemek bu bug-fix'in kapsami disina bagimlilik sizdirirdi.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
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
@Import(PresenceOverWebSocketTest.ShortGrace.class)
class PresenceOverWebSocketTest {

    /**
     * Grace penceresi uretimde 45 sn; kopma ayagini gercek zamanda olcmek icin milisaniyeye
     * cekilir. Sinanan sey pencerenin UZUNLUGU degil (o InMemoryPresenceTest'te sahte Clock ile
     * olculur), left()'in GERCEK bir soket kapanisinda cagrilip cagrilmadigidir.
     */
    @TestConfiguration
    static class ShortGrace {
        @Bean @Primary
        PresencePort shortGracePresence(Clock clock) {
            return new InMemoryPresence(clock, Duration.ofSeconds(1));
        }
    }

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @LocalServerPort int port;

    @MockitoBean VenueProviderPort provider;   // @Primary ResilientVenueProvider yerine
    @MockitoBean GoogleIdVerifier google;      // dis Google cagrisi yok
    @MockitoBean ReverseGeocodePort geocoder;  // gercek Nominatim adapteri baglamda kalmasin

    private final HttpClient http = HttpClient.newHttpClient();
    private WebSocketStompClient stompClient;
    private StompSession stompSession;

    @BeforeEach
    void freshRateLimitBucketsAndStompClient() {
        rateLimit.reset();
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
    }

    @AfterEach
    void disconnectIfStillOpen() {
        if (stompSession != null && stompSession.isConnected()) {
            stompSession.disconnect();
        }
    }

    @Test
    void hostGoesOnlineOnConnectAndOfflineWhenTheSocketCloses() throws Exception {
        when(google.verify("gid-presence"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("presence@bumpinto.test", "Mehmet"));

        // 0 — mobil giris: Google id_token -> backend access token (body'de) — ApiHappyPathTest'teki
        // adim 0 ile ayni sozlesme.
        HttpResponse<String> loginResponse = send(HttpRequest.newBuilder(uri("/api/auth/google"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"idToken\":\"gid-presence\"}")));
        assertThat(loginResponse.statusCode()).isEqualTo(200);
        String accessToken = json.readTree(loginResponse.body()).get("accessToken").asString();
        assertThat(accessToken).isNotBlank();

        // 1 — host oturum kurar (Bearer; mobil istemci -> participantToken body'de).
        HttpResponse<String> createResponse = send(HttpRequest.newBuilder(uri("/api/sessions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + accessToken)
                .POST(HttpRequest.BodyPublishers.ofString("{\"activityTypes\":[\"COFFEE\"],"
                        + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}")));
        assertThat(createResponse.statusCode()).isEqualTo(201);
        JsonNode created = json.readTree(createResponse.body());
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();
        assertThat(slug).isNotBlank();
        assertThat(hostToken).isNotBlank();

        // 2 — gercek STOMP istemcisi /api/sessions/{slug}/ws'e baglanir. Tarayici bunu cerezle
        // yapar; Java istemcisinin cerez kavani yok, o yuzden ParticipantTokenFilter'in mobil
        // yolunu (X-Participant-Token) HANDSHAKE basligina koyariz — cerezle birebir ayni yetki.
        WebSocketHttpHeaders handshakeHeaders = new WebSocketHttpHeaders();
        handshakeHeaders.add(ParticipantTokenFilter.HEADER, hostToken);
        String wsUrl = "ws://localhost:" + port + "/api/sessions/" + slug + "/ws";
        CompletableFuture<StompSession> connecting =
                stompClient.connectAsync(wsUrl, handshakeHeaders, new StompSessionHandlerAdapter() {
                });
        stompSession = connecting.get(5, TimeUnit.SECONDS);
        assertThat(stompSession.isConnected()).isTrue();

        // 3 — SORUNUN KANITI: connect olayi asenkron, bu yuzden kisa bir sure poll edilir.
        // Bug varken bu hicbir zaman true olmaz (5 sn'lik butce timeout'a carpar).
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(isHostOnline(slug, hostToken)).isTrue());

        // 4 — KOPMA AYAGI: soket kapaninca left() gercekten cagriliyor mu? Ilk yazimda burasi
        // "grace icinde hala online" diye sinaniyordu; o iddia left() HIC cagrilmasa da gecerdi
        // (baglanti kumesi bosalmayinca grace zaten devreye girmez) ve tarayicida kisi sonsuza
        // kadar online kaldi. Sinanmasi gereken bosalma, dayanikliligi degil.
        stompSession.disconnect();
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(isHostOnline(slug, hostToken)).isFalse());
    }

    /**
     * YAYIN AYAGI: kopan soket, oturumda KALAN abonelere presence_changed gonderiyor mu?
     * Kullanici gozlemi (2026-09-04): "biri girdiginde aninda online oluyor ama cikinca sayfayi
     * yenilemeden offline'a gecmiyor." Bu asimetri tam olarak buraya isaret eder — katilim IKI
     * olay uretir (participant_joined + presence_changed), cikis YALNIZ presence_changed. Ilki
     * calisip ikincisi calismazsa ekranda tam bu davranis gorunur.
     *
     * <p>Onceki testler yalnizca HTTP ile "artik offline mi" diye soruyordu; yayinin gidip
     * gitmedigini hicbir sey iddia etmiyordu.
     */
    @Test
    void aClosingSocketNotifiesTheOnesStillInTheRoom() throws Exception {
        when(google.verify("gid-broadcast"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("broadcast@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(send(HttpRequest.newBuilder(uri("/api/auth/google"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"idToken\":\"gid-broadcast\"}")))
                .body()).get("accessToken").asString();
        JsonNode created = json.readTree(send(HttpRequest.newBuilder(uri("/api/sessions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + accessToken)
                .POST(HttpRequest.BodyPublishers.ofString("{\"activityTypes\":[\"COFFEE\"],"
                        + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}"))).body());
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();

        // Davetli katilir (kamu ucu) ve kendi token'ini alir.
        JsonNode joined = json.readTree(send(HttpRequest.newBuilder(uri("/api/sessions/" + slug + "/participants"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"displayName\":\"Ayşe\","
                        + "\"lat\":51.3855,\"lng\":5.7120}"))).body());
        String guestToken = joined.get("participantToken").asString();

        // Host odada KALIR ve dinler; davetli baglanip kopar.
        BlockingQueue<String> received = new LinkedBlockingQueue<>();
        StompSession watcher = connect(slug, hostToken);
        watcher.subscribe("/topic/session/" + slug, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override public void handleFrame(StompHeaders headers, Object payload) {
                received.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });

        StompSession leaver = connect(slug, guestToken);
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .until(() -> received.stream().anyMatch(frame -> frame.contains("presence_changed")));
        received.clear();

        leaver.disconnect();

        // IKI zil beklenir. Birincisi kopma aninda calar ama o an cevap HENUZ degismemistir
        // (kisi grace penceresi icinde hala online); ikincisi pencere gecince calar ve gercek
        // degisikligi tasir. Tek zil varken istemci degisikligi ancak 30 sn'lik emniyet
        // poll'unde goruyordu — ekranda "cikan kisi online kaliyor" diye gorunen sey buydu.
        await().atMost(Duration.ofSeconds(8)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(received.stream()
                        .filter(frame -> frame.contains("presence_changed")).count())
                        .as("kopmada bir, grace bitiminde bir daha")
                        .isGreaterThanOrEqualTo(2));
        assertThat(isHostOnline(slug, hostToken)).isTrue(); // izleyen hala odada
        watcher.disconnect();
    }

    private StompSession connect(String slug, String participantToken) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add(ParticipantTokenFilter.HEADER, participantToken);
        return stompClient.connectAsync("ws://localhost:" + port + "/api/sessions/" + slug + "/ws",
                headers, new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
    }

    private boolean isHostOnline(String slug, String hostToken) throws Exception {
        HttpResponse<String> view = send(HttpRequest.newBuilder(uri("/api/sessions/" + slug))
                .header(ParticipantTokenFilter.HEADER, hostToken)
                .GET());
        assertThat(view.statusCode()).isEqualTo(200);
        JsonNode node = json.readTree(view.body());
        for (JsonNode participant : node.get("participants")) {
            if (participant.get("host").asBoolean()) {
                return participant.get("online").asBoolean();
            }
        }
        throw new AssertionError("host katilimcisi SessionView.participants icinde bulunamadi");
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
