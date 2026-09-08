package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppleIdVerifierTest {

    static final AppProps.Apple APPLE = TestProps.apple();

    static Jwt jwt(String audience, Map<String, Object> extra) {
        Jwt.Builder builder = Jwt.withTokenValue("t").header("alg", "RS256")
                .issuer("https://appleid.apple.com").subject("apple-sub-1")
                .audience(List.of(audience))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600));
        extra.forEach(builder::claim);
        return builder.build();
    }

    /** Web Services ID ve native bundle id AYRI audience'lardir; ikisi de gecmeli. */
    @Test
    void bothServicesIdAndBundleIdAreAcceptedAudiences() {
        OAuth2TokenValidator<Jwt> validator = AppleIdVerifier.validator(APPLE.audiences());
        assertThat(validator.validate(jwt("app.bumpinto.web", Map.of())).hasErrors()).isFalse();
        assertThat(validator.validate(jwt("app.bumpinto.ios", Map.of())).hasErrors()).isFalse();
        assertThat(validator.validate(jwt("someone.else", Map.of())).hasErrors()).isTrue();
        assertThatThrownBy(() -> AppleIdVerifier.validator(List.of()))
                .isInstanceOf(IllegalStateException.class);
    }

    /** Native istemci ham nonce'un SHA-256 HEX'ini basar, web ham nonce'u; ikisi de gecer. */
    @Test
    void nonceMatchesRawOrSha256Hex() {
        String raw = "n-0S6_WzA2Mj";
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of("nonce", raw)), raw))
                .isTrue();
        assertThat(AppleIdVerifier.nonceMatches(
                jwt("app.bumpinto.web", Map.of("nonce", AppleIdVerifier.sha256Hex(raw))), raw))
                .isTrue();
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of("nonce", raw)), "x"))
                .isFalse();
        // Istemci nonce kullanmiyorsa kontrol atlanir; kullaniyor ama token tasimiyorsa REDDEDILIR.
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of()), null)).isTrue();
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of()), raw)).isFalse();
    }
}
