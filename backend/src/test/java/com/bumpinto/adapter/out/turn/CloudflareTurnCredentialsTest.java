package com.bumpinto.adapter.out.turn;

import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class CloudflareTurnCredentialsTest {

    static final String URL =
            "https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers";

    static AppProps props(String keyId, String token) {
        return TestProps.of(new AppProps.Turn(keyId, token));
    }

    @Test
    void issuesShortLivedCredentialsWithBearerAndTtl() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL)
                .header("Authorization", "Bearer tok-1")
                .header("Content-Type", "application/json")
                .body("{\"ttl\":7260}")
                .thenReturn("""
                        {"iceServers":[{"urls":["stun:stun.cloudflare.com:3478",
                          "turn:turn.cloudflare.com:3478?transport=udp"],
                          "username":"u1","credential":"c1"}]}
                        """).withStatus(201);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofSeconds(7260));

        assertThat(ice.relay()).isTrue();
        assertThat(ice.iceServers()).hasSize(1);
        assertThat(ice.iceServers().get(0).urls()).contains("turn:turn.cloudflare.com:3478?transport=udp");
        assertThat(ice.iceServers().get(0).username()).isEqualTo("u1");
        assertThat(ice.iceServers().get(0).credential()).isEqualTo("c1");
        mock.verifyAll();
    }

    @Test
    void fallsBackToStunWhenCloudflareFails() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL).thenReturn("{\"error\":\"nope\"}").withStatus(500);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        assertThat(ice.iceServers().get(0).urls()).allMatch(u -> u.startsWith("stun:"));
        mock.verifyAll();
    }

    @Test
    void fallsBackToStunOnAWrongShapedBody() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL).thenReturn("{\"iceServers\":[\"x\"]}").withStatus(201);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        mock.verifyAll();
    }

    @Test
    void fallsBackToStunWhenNoServerHasUrls() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL).thenReturn("{\"iceServers\":[{}]}").withStatus(201);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        mock.verifyAll();
    }

    @Test
    void readsTheLegacySingleObjectResponse() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL)
                .thenReturn("""
                        {"iceServers":{"urls":"turn:turn.cloudflare.com:3478",
                          "username":"u","credential":"c"}}
                        """).withStatus(201);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isTrue();
        assertThat(ice.iceServers()).hasSize(1);
        assertThat(ice.iceServers().get(0).urls()).containsExactly("turn:turn.cloudflare.com:3478");
        assertThat(ice.iceServers().get(0).username()).isEqualTo("u");
        assertThat(ice.iceServers().get(0).credential()).isEqualTo("c");
        mock.verifyAll();
    }

    @Test
    void fallsBackToStunWithoutAnyRequestWhenNotConfigured() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL).thenReturn("{}");

        IceConfig ice = new CloudflareTurnCredentials(http, props("", ""))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        mock.assertThat(HttpMethod.POST, URL).wasInvokedTimes(0);
    }

    /** toString sirri sizdirmaz (WebSecuritySliceTest.tokenCarryingDtosMaskSecretsInToString deseni). */
    @Test
    void turnPropsMaskTheApiToken() {
        assertThat(props("key-1", "tok-secret").turn().toString())
                .doesNotContain("tok-secret").contains("key-1");
    }
}
