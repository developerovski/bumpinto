package com.bumpinto.adapter.out.apple;

import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AppleTokenClientTest {

    static final String TOKEN_URL = "https://appleid.apple.com/auth/token";

    static final AppProps.Apple CONFIGURED = new AppProps.Apple("app.bumpinto.web",
            "app.bumpinto.ios", "TEAM123456", "KEY1234567", AppleTestKeys.EC_P256_PKCS8_PEM);

    @Test
    void exchangesAuthorizationCodeForARefreshToken() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, TOKEN_URL)
                .thenReturn("{\"refresh_token\":\"rt-42\",\"access_token\":\"at\"}").withStatus(200);

        assertThat(new AppleTokenClient(http, TestProps.withApple(CONFIGURED))
                .exchangeRefreshToken("code-1")).contains("rt-42");
    }

    /** FAIL-OPEN: Apple 5xx dondurse de giris tamamlanmali; yalniz revoke yetenegi kaybolur. */
    @Test
    void serverErrorYieldsEmptyInsteadOfThrowing() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, TOKEN_URL).thenReturn("nope").withStatus(503);

        assertThat(new AppleTokenClient(http, TestProps.withApple(CONFIGURED))
                .exchangeRefreshToken("code-1")).isEmpty();
    }

    @Test
    void unconfiguredAppleNeitherExchangesNorRevokes() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        AppleTokenClient client = new AppleTokenClient(http,
                TestProps.withApple(new AppProps.Apple("", "", "", "", "")));

        assertThat(client.exchangeRefreshToken("code-1")).isEmpty();
        client.revoke("rt-42");   // sessiz no-op, istisna yok

        mock.verifyAll();         // Apple'a hicbir cagri yapilmadi
    }
}
