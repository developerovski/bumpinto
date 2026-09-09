package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenServiceTest {

    static final AppProps PROPS = TestProps.defaults();

    final TokenService tokens = new TokenService(PROPS, Clock.systemUTC());

    @Test
    void issueAndParseRoundTrip() {
        UUID userId = UUID.randomUUID();
        String token = tokens.issueAccessToken(userId, "m@x.dev");

        Jwt jwt = tokens.decoder().decode(token);
        assertThat(jwt.getSubject()).isEqualTo(userId.toString());
        assertThat(jwt.getClaimAsString("email")).isEqualTo("m@x.dev");
        // Sure PROPS'tan turetilir, GOMULMEZ: erisim TTL'i 12h -> 15m degistiginde (B-16)
        // gomulu "11 saat" sayisi testi yanlis yerden kirdi.
        Duration ttl = PROPS.security().tokenTtl();
        assertThat(jwt.getExpiresAt())
                .isAfter(Instant.now().plus(ttl).minus(Duration.ofMinutes(1)))
                .isBefore(Instant.now().plus(ttl).plus(Duration.ofMinutes(1)));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");
        assertThatThrownBy(() -> tokens.decoder().decode(token + "x"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretIsRejectedAtConstruction() {
        AppProps weak = TestProps.of(new AppProps.Security("cid", "kisa", Duration.ofHours(1), Duration.ofDays(30)));
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
        AppProps unresolved = TestProps.of(new AppProps.Security("cid",
                "${A_VERY_LONG_TOKEN_SECRET_ENV_VARIABLE_NAME}", Duration.ofHours(1),
                Duration.ofDays(30)));
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

    /**
     * Silme jetonu HESAP jetonu SAYILMAZ. Ayni TOKEN_SECRET imzaladigi icin kapi olmasa kisa
     * omurlu bir silme jetonu Authorization: Bearer ile tum hesap uclarini acardi (typ=pt
     * kapisinin ayni gerekcesi).
     */
    @Test
    void deleteTokenIsNotAnAccountToken() {
        UUID user = UUID.randomUUID();
        String delete = tokens.issueDeleteToken(user);
        assertThat(tokens.decoder().decode(delete).getClaimAsString(TokenService.TYPE_CLAIM))
                .isEqualTo(TokenService.DELETE_TYPE);
        assertThat(tokens.isDeleteTokenFor(delete, user)).isTrue();
        assertThat(tokens.isDeleteTokenFor(delete, UUID.randomUUID())).isFalse();
        assertThat(tokens.isDeleteTokenFor(tokens.issueAccessToken(user, "a@b.test"), user))
                .isFalse();
    }
}
