package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.infra.config.AppProps;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Google'in JWKS'ine cikmadan, lokal bir test anahtar cifti ile imzalanmis id_token uzerinde
 * PRODUCTION dogrulayici zincirini (imza + issuer + exp + audience) kosar.
 */
class GoogleIdVerifierTest {

    static final String CLIENT_ID = "bumpinto-web.apps.googleusercontent.com";

    static final KeyPair KEYS = generateKeys();

    static KeyPair generateKeys() {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
            gen.initialize(2048);
            return gen.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static AppProps props(String googleClientId) {
        return new AppProps(
                new AppProps.Security(googleClientId, "0123456789abcdef0123456789abcdef",
                        Duration.ofHours(12)),
                new AppProps.Providers("", ""),
                new AppProps.Cors(List.of()),
                new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 5000));
    }

    static GoogleIdVerifier verifier() {
        return new GoogleIdVerifier(props(CLIENT_ID),
                NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build());
    }

    static String idToken(String issuer, String audience, Instant issuedAt, Instant expiresAt) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).build(),
                    new JWTClaimsSet.Builder()
                            .issuer(issuer)
                            .audience(audience)
                            .subject("112233445566")
                            .claim("email", "m@x.dev")
                            .claim("name", "Mehmet")
                            .issueTime(Date.from(issuedAt))
                            .expirationTime(Date.from(expiresAt))
                            .build());
            jwt.sign(new RSASSASigner(KEYS.getPrivate()));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static String validToken() {
        Instant now = Instant.now();
        return idToken(GoogleIdVerifier.ISSUER, CLIENT_ID, now, now.plus(Duration.ofHours(1)));
    }

    @Test
    void correctAudienceAndIssuerIsAccepted() {
        GoogleIdVerifier.GoogleUser user = verifier().verify(validToken());

        assertThat(user.email()).isEqualTo("m@x.dev");
        assertThat(user.name()).isEqualTo("Mehmet");
    }

    /** Baska bir client-id icin basilmis id_token kabul edilirse hesap ele gecirilir. */
    @Test
    void foreignAudienceIsRejected() {
        Instant now = Instant.now();
        String foreign = idToken(GoogleIdVerifier.ISSUER, "saldirgan.apps.googleusercontent.com",
                now, now.plus(Duration.ofHours(1)));

        assertThatThrownBy(() -> verifier().verify(foreign))
                .isInstanceOf(JwtException.class)
                .hasMessageContaining("audience mismatch");
    }

    @Test
    void expiredTokenIsRejected() {
        Instant now = Instant.now();
        String expired = idToken(GoogleIdVerifier.ISSUER, CLIENT_ID,
                now.minus(Duration.ofHours(2)), now.minus(Duration.ofHours(1)));

        assertThatThrownBy(() -> verifier().verify(expired)).isInstanceOf(JwtException.class);
    }

    @Test
    void foreignIssuerIsRejected() {
        Instant now = Instant.now();
        String wrongIssuer = idToken("https://accounts.evil.example", CLIENT_ID,
                now, now.plus(Duration.ofHours(1)));

        assertThatThrownBy(() -> verifier().verify(wrongIssuer)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedByAnotherKeyIsRejected() {
        GoogleIdVerifier otherKeyVerifier = new GoogleIdVerifier(props(CLIENT_ID),
                NimbusJwtDecoder.withPublicKey((RSAPublicKey) generateKeys().getPublic()).build());

        assertThatThrownBy(() -> otherKeyVerifier.verify(validToken()))
                .isInstanceOf(JwtException.class);
    }

    /**
     * Eksik client-id fail-closed'dir ama sessizdir: "hic kimse giris yapamiyor" arizasi yerine
     * acilis patlar. TOKEN_SECRET ile ayni muamele (bkz. TokenServiceTest).
     */
    @Test
    void missingClientIdIsRejectedAtConstruction() {
        for (String bad : List.of("", "   ", "${GOOGLE_CLIENT_ID}")) {
            assertThatThrownBy(() -> new GoogleIdVerifier(props(bad),
                    NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("GOOGLE_CLIENT_ID is not configured");
        }
    }

    /** application.yml'de default OLMADIGINI sabitler: local disi profil env'siz ayaga kalkmaz. */
    @Test
    void deployedProfileWithoutClientIdFailsToStart() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(AppConfig.class, GoogleIdVerifier.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .profiles("preprod")
                .run()
                .close())
                .rootCause()
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("GOOGLE_CLIENT_ID is not configured");
    }
}
