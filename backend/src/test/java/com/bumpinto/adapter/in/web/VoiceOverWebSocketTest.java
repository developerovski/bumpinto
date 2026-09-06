package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.GeocodePort;
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
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

/**
 * Sinyal relay'i, abonelikle uyelik ve bos oturum kapanisi gercek bir STOMP istemcisiyle
 * sinanir: interceptor + listener + @MessageMapping framework yapisticisidir, mock'lu Message
 * yalniz Spring'in sarmalayicisini dogrular (PresenceOverWebSocketTest'teki dersin aynisi).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
@Import(PresenceOverWebSocketTest.ShortGrace.class)
class VoiceOverWebSocketTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @LocalServerPort int port;

    @MockitoBean VenueProviderPort provider;
    @MockitoBean GoogleIdVerifier google;
    @MockitoBean ReverseGeocodePort geocoder;
    @MockitoBean GeocodePort forwardGeocoder;   // NominatimGeocoder iki portu da uygular; ikisi de mock

    private final HttpClient http = HttpClient.newHttpClient();
    private WebSocketStompClient stompClient;
    private final List<StompSession> open = new ArrayList<>();

    record Room(String slug, String hostToken, UUID hostId, String guestToken, UUID guestId) {
    }

    record Inbox(BlockingQueue<String> frames, StompSession.Subscription subscription) {
    }

    @BeforeEach
    void freshBucketsAndClient() {
        rateLimit.reset();
        // Java istemcisinin kendi WebSocketContainer'i (Tomcat) 8 KB'lik varsayilan metin
        // arabellegiyle gelir; sunucu 32 KB'a acilsa bile (WebSocketConfig.MESSAGE_SIZE_LIMIT)
        // istemci tarafi kucuk kalirsa buyuk bir SDP kendisine ULASIRKEN "too big" ile soketi
        // kapatir. Tarayicida bu sinir yok — yalniz bu Java test istemcisine ozgu.
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxTextMessageBufferSize(32 * 1024);
        container.setDefaultMaxBinaryMessageBufferSize(32 * 1024);
        stompClient = new WebSocketStompClient(new StandardWebSocketClient(container));
    }

    @AfterEach
    void closeSockets() {
        open.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
    }

    @Test
    void subscribingToTheOwnInboxJoinsTheRoomAndRingsTheRoster() throws Exception {
        Room room = openRoom("gid-voice-join");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());

        assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse();
        listen(guest, inbox(room.slug(), room.guestId()));

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> hostTopic.frames().stream().anyMatch(f -> f.contains("voice_roster_changed")));

        HttpResponse<String> creds = send(HttpRequest.newBuilder(uri("/api/sessions/" + room.slug() + "/voice/credentials"))
                .header(ParticipantTokenFilter.HEADER, room.guestToken())
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(creds.statusCode()).isEqualTo(200);
        assertThat(json.readTree(creds.body()).get("relay").asBoolean()).isFalse(); // TURN ayarsiz
    }

    @Test
    void anOfferIsRelayedToItsTargetStampedWithTheSenderId() throws Exception {
        Room room = openRoom("gid-voice-relay");
        StompSession host = connect(room.slug(), room.hostToken());
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        listen(guest, inbox(room.slug(), room.guestId()));
        awaitBothInVoice(room);

        signal(guest, room.slug(), room.hostId(), "offer");

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> !hostInbox.frames().isEmpty());
        String frame = hostInbox.frames().poll();
        assertThat(frame).contains("\"from\":\"" + room.guestId() + "\"")
                .contains("\"type\":\"offer\"").contains("\"sdp\":\"v=0 test\"");
    }

    @Test
    void signalsFromSomeoneOutsideTheRoomAreDropped() throws Exception {
        Room room = openRoom("gid-voice-outsider");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.hostId())).isTrue());
        StompSession guest = connect(room.slug(), room.guestToken()); // abone DEGIL → uye degil

        signal(guest, room.slug(), room.hostId(), "offer");

        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3)).until(() -> hostInbox.frames().isEmpty());
    }

    @Test
    void someoneElsesInboxCannotBeSubscribed() throws Exception {
        Room room = openRoom("gid-voice-eavesdrop");
        StompSession host = connect(room.slug(), room.hostToken());
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        listen(guest, inbox(room.slug(), room.guestId()));
        Inbox eavesdrop = listen(guest, inbox(room.slug(), room.hostId())); // dusurulur
        awaitBothInVoice(room);

        signal(guest, room.slug(), room.hostId(), "answer");

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> !hostInbox.frames().isEmpty());
        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3)).until(() -> eavesdrop.frames().isEmpty());
    }

    @Test
    void clientsStillCannotPublishToTheSessionTopic() throws Exception {
        Room room = openRoom("gid-voice-topic");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());
        listen(guest, inbox(room.slug(), room.guestId()));

        StompHeaders headers = new StompHeaders();
        headers.setDestination("/topic/session/" + room.slug());
        headers.setContentType(MimeTypeUtils.APPLICATION_JSON);
        guest.send(headers, "{\"type\":\"session_decided\"}".getBytes(StandardCharsets.UTF_8));

        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3))
                .until(() -> hostTopic.frames().stream().noneMatch(f -> f.contains("session_decided")));
    }

    @Test
    void unsubscribingAndDisconnectingLeaveTheRoom() throws Exception {
        Room room = openRoom("gid-voice-leave");
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox mine = listen(guest, inbox(room.slug(), room.guestId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(400))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());

        mine.subscription().unsubscribe();
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(400))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse());

        listen(guest, inbox(room.slug(), room.guestId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(400))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());

        guest.disconnect();
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse());
    }

    /** Katman 2: son kisi de kopunca (grace 1 sn) oda kendiliginden kapanir. */
    @Test
    void theRoomClosesWhenEveryoneIsGone() throws Exception {
        Room room = openRoom("gid-voice-empty");
        assertThat(view(room.slug(), room.hostToken()).get("voice").isNull()).isFalse();
        StompSession host = connect(room.slug(), room.hostToken());
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(hostOnline(room.slug(), room.hostToken())).isTrue());

        host.disconnect();

        await().atMost(Duration.ofSeconds(8)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(view(room.slug(), room.hostToken()).get("voice").isNull()).isTrue());
    }

    /** 16 KB tavan gercek: altindaki gecer aynen, ustundeki sessizce duser, soket kapanmaz. */
    @Test
    void aLargeSdpStillArrivesAndAnOversizedOneIsDropped() throws Exception {
        Room room = openRoom("gid-voice-large-sdp");
        StompSession host = connect(room.slug(), room.hostToken());
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        listen(guest, inbox(room.slug(), room.guestId()));
        awaitBothInVoice(room);

        String withinBudget = "a".repeat(12_000);
        signal(guest, room.slug(), room.hostId(), "offer", withinBudget);
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> !hostInbox.frames().isEmpty());
        JsonNode arrived = json.readTree(hostInbox.frames().poll());
        assertThat(arrived.get("sdp").asString()).hasSize(12_000);

        String oversized = "b".repeat(20_000);
        signal(guest, room.slug(), room.hostId(), "answer", oversized);
        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3)).until(() -> hostInbox.frames().isEmpty());
        assertThat(guest.isConnected()).isTrue();
    }

    /** VoiceInboundGuard: kendi kutusuna sub/unsub dongusu SUBSCRIPTION_BUDGET_PER_MINUTE'la kesilir. */
    @Test
    void aSubscribeUnsubscribeLoopIsBudgeted() throws Exception {
        Room room = openRoom("gid-voice-budget");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());

        for (int i = 0; i < 30; i++) {
            StompSession.Subscription subscription = guest.subscribe(inbox(room.slug(), room.guestId()),
                    new StompFrameHandler() {
                        @Override public Type getPayloadType(StompHeaders headers) {
                            return byte[].class;
                        }

                        @Override public void handleFrame(StompHeaders headers, Object payload) {
                        }
                    });
            subscription.unsubscribe();
        }

        // Patlama agdan gecip yerlesene kadar bekle; sonra sayiyi butce + yeniden-doldurma payiyla dogrula.
        await().pollDelay(Duration.ofMillis(500)).atMost(Duration.ofSeconds(3)).until(() -> true);
        long rosterChanges = hostTopic.frames().stream().filter(f -> f.contains("voice_roster_changed")).count();
        assertThat(rosterChanges).isBetween(2L, (long) (VoiceInboundGuard.SUBSCRIPTION_BUDGET_PER_MINUTE + 4));

        // Butce hala tukenmis: patlamadan hemen sonraki bir abonelik de dusurulur — 1 sn boyunca
        // inVoice true'ya DONMEZ (during semantigi: surekli false kalmali, tek seferlik bakis degil).
        listen(guest, inbox(room.slug(), room.guestId()));
        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3))
                .until(() -> !inVoice(room.slug(), room.hostToken(), room.guestId()));
    }

    /** Ayni katilimcinin ikinci aboneligi (kume degismez) zil calmaz. */
    @Test
    void resubscribingDoesNotRingTheRoster() throws Exception {
        Room room = openRoom("gid-voice-resubscribe");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());
        listen(guest, inbox(room.slug(), room.guestId()));

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());
        // Ilk katilimin voice_roster_changed'i host'a ULASTIKTAN sonra temizle — yoksa clear()
        // o frame'i yakalarsa test asagida "hic zil calmadi"yi yanlislikla dogrular.
        await().atMost(Duration.ofSeconds(5))
                .until(() -> hostTopic.frames().stream().anyMatch(f -> f.contains("voice_roster_changed")));
        hostTopic.frames().clear();

        listen(guest, inbox(room.slug(), room.guestId())); // ikinci abonelik, ayni katilimci, farkli id

        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3))
                .until(() -> hostTopic.frames().stream().noneMatch(f -> f.contains("voice_roster_changed")));
    }

    // ---- yardimcilar ----

    private Room openRoom(String googleId) throws Exception {
        when(google.verify(googleId))
                .thenReturn(new GoogleIdVerifier.GoogleUser(googleId + "@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(postJson("/api/auth/google",
                "{\"idToken\":\"" + googleId + "\"}", null).body()).get("accessToken").asString();
        JsonNode created = json.readTree(postJson("/api/sessions",
                "{\"activityTypes\":[\"COFFEE\"],\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}",
                "Bearer " + accessToken).body());
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();
        JsonNode joined = json.readTree(postJson("/api/sessions/" + slug + "/participants",
                "{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}", null).body());
        HttpResponse<String> started = send(HttpRequest.newBuilder(uri("/api/sessions/" + slug + "/voice"))
                .header(ParticipantTokenFilter.HEADER, hostToken)
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(started.statusCode()).isEqualTo(200);
        return new Room(slug, hostToken, UUID.fromString(created.get("participantId").asString()),
                joined.get("participantToken").asString(),
                UUID.fromString(joined.get("participantId").asString()));
    }

    private HttpResponse<String> postJson(String path, String body, String authorization) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (authorization != null) {
            request.header("Authorization", authorization);
        }
        return send(request);
    }

    private StompSession connect(String slug, String participantToken) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add(ParticipantTokenFilter.HEADER, participantToken);
        StompSession session = stompClient.connectAsync("ws://localhost:" + port + "/api/sessions/" + slug + "/ws",
                headers, new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
        open.add(session);
        return session;
    }

    private static String inbox(String slug, UUID participantId) {
        return "/topic/session/" + slug + "/voice/" + participantId;
    }

    private Inbox listen(StompSession session, String destination) {
        BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        StompSession.Subscription subscription = session.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override public void handleFrame(StompHeaders headers, Object payload) {
                frames.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });
        return new Inbox(frames, subscription);
    }

    private static void signal(StompSession from, String slug, UUID to, String type) {
        signal(from, slug, to, type, "v=0 test");
    }

    private static void signal(StompSession from, String slug, UUID to, String type, String sdp) {
        StompHeaders headers = new StompHeaders();
        headers.setDestination("/app/sessions/" + slug + "/voice/signal");
        headers.setContentType(MimeTypeUtils.APPLICATION_JSON);
        from.send(headers, ("{\"to\":\"" + to + "\",\"type\":\"" + type + "\",\"sdp\":\"" + sdp + "\"}")
                .getBytes(StandardCharsets.UTF_8));
    }

    private void awaitBothInVoice(Room room) {
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200)).untilAsserted(() -> {
            assertThat(inVoice(room.slug(), room.hostToken(), room.hostId())).isTrue();
            assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue();
        });
    }

    private JsonNode view(String slug, String token) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/api/sessions/" + slug))
                .header(ParticipantTokenFilter.HEADER, token).GET());
        assertThat(response.statusCode()).isEqualTo(200);
        return json.readTree(response.body());
    }

    private boolean inVoice(String slug, String token, UUID participantId) throws Exception {
        for (JsonNode p : view(slug, token).get("participants")) {
            if (participantId.toString().equals(p.get("id").asString())) {
                return p.get("inVoice").asBoolean();
            }
        }
        throw new AssertionError("katilimci bulunamadi: " + participantId);
    }

    private boolean hostOnline(String slug, String token) throws Exception {
        for (JsonNode p : view(slug, token).get("participants")) {
            if (p.get("host").asBoolean()) {
                return p.get("online").asBoolean();
            }
        }
        throw new AssertionError("host bulunamadi");
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
