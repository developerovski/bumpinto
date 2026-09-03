package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.infra.config.AppProps;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenServiceTest {

    static final AppProps PROPS = new AppProps(
            new AppProps.Security("cid", "0123456789abcdef0123456789abcdef", Duration.ofHours(12)),
            new AppProps.Providers("", ""),
            new AppProps.Cors(List.of()),
            new AppProps.Cookies(false, ""),
            new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000, 5000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));

    final TokenService tokens = new TokenService(PROPS, Clock.systemUTC());

    @Test
    void issueAndParseRoundTrip() {
        UUID userId = UUID.randomUUID();
        String token = tokens.issueAccessToken(userId, "m@x.dev");

        Jwt jwt = tokens.decoder().decode(token);
        assertThat(jwt.getSubject()).isEqualTo(userId.toString());
        assertThat(jwt.getClaimAsString("email")).isEqualTo("m@x.dev");
        assertThat(jwt.getExpiresAt()).isAfter(Instant.now().plus(Duration.ofHours(11)));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");
        assertThatThrownBy(() -> tokens.decoder().decode(token + "x"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretIsRejectedAtConstruction() {
        AppProps weak = new AppProps(
                new AppProps.Security("cid", "kisa", Duration.ofHours(1)),
                PROPS.providers(), PROPS.cors(), PROPS.cookies(), PROPS.rateLimit(), PROPS.quota(),
                PROPS.geocode());
        assertThatThrownBy(() -> new TokenService(weak, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }

    /**
     * Sir yonetimi acilista sabitlenir: application.yml'de TOKEN_SECRET default'u YOK, bu yuzden
     * local disi bir profilde env saglanmazsa context hic ayaga kalkmaz (fail-fast).
     */
    static ConfigurableApplicationContext boot(String profile, String... props) {
        return new SpringApplicationBuilder(AppConfig.class, TokenService.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .profiles(profile)
                .properties(props)
                .run();
    }

    @Test
    void deployedProfileWithoutSecretFailsToStart() {
        assertThatThrownBy(() -> boot("preprod").close())
                .rootCause()
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("TOKEN_SECRET is not configured");
    }

    @Test
    void unresolvedPlaceholderIsRejectedEvenWhenLongEnough() {
        AppProps unresolved = new AppProps(
                new AppProps.Security("cid", "${A_VERY_LONG_TOKEN_SECRET_ENV_VARIABLE_NAME}",
                        Duration.ofHours(1)),
                PROPS.providers(), PROPS.cors(), PROPS.cookies(), PROPS.rateLimit(), PROPS.quota(),
                PROPS.geocode());
        assertThatThrownBy(() -> new TokenService(unresolved, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("TOKEN_SECRET is not configured");
    }

    @Test
    void deployedProfileWithSecretStarts() {
        try (ConfigurableApplicationContext ctx =
                     boot("preprod", "TOKEN_SECRET=" + PROPS.security().tokenSecret())) {
            assertThat(ctx.getBean(TokenService.class)).isNotNull();
        }
    }

    @Test
    void localProfileStartsWithoutSecret() {
        try (ConfigurableApplicationContext ctx = boot("local")) {
            assertThat(ctx.getBean(AppProps.class).security().tokenSecret()).hasSizeGreaterThanOrEqualTo(32);
        }
    }
}
