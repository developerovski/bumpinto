package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * Apple identity token dogrulayicisi — GoogleIdVerifier'in esi. Fark: audience TEK degil (web
 * Services ID + native bundle id) ve nonce kontrolu var. Yapilandirilmamis Apple acilista
 * PATLATMAZ (Turn deseni): decoder tembel kurulur, uc configured() kapisinda 503 doner.
 */
@Component
public class AppleIdVerifier {

    static final String JWKS_URI = "https://appleid.apple.com/auth/keys";
    static final String ISSUER = "https://appleid.apple.com";

    private final AppProps props;
    private volatile JwtDecoder decoder;

    @Autowired
    public AppleIdVerifier(AppProps props) {
        this.props = props;
    }

    /** Test kancasi: hazir decoder, aga cikmadan. */
    AppleIdVerifier(AppProps props, NimbusJwtDecoder decoder) {
        this.props = props;
        decoder.setJwtValidator(validator(props.apple().audiences()));
        this.decoder = decoder;
    }

    static OAuth2TokenValidator<Jwt> validator(List<String> audiences) {
        if (audiences.isEmpty()) {
            throw new IllegalStateException("APPLE_SERVICES_ID is not configured");
        }
        OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.stream().anyMatch(audiences::contains)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "audience mismatch", null));
        };
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ISSUER), audienceCheck);
    }

    /** privateRelay: e-posta Apple'in gizli aktarma adresi mi (e-posta ikincil eslestiricidir). */
    public record AppleUser(String sub, String email, boolean privateRelay) {
    }

    public boolean configured() {
        return props.apple().configured();
    }

    public AppleUser verify(String identityToken, String nonce) {
        Jwt jwt = decoder().decode(identityToken);
        if (!nonceMatches(jwt, nonce)) {
            throw new BadJwtException("nonce mismatch");
        }
        String email = jwt.getClaimAsString("email");
        return new AppleUser(jwt.getSubject(), email,
                email != null && email.endsWith("@privaterelay.appleid.com"));
    }

    static boolean nonceMatches(Jwt jwt, String expected) {
        if (expected == null) {
            return true;
        }
        String claim = jwt.getClaimAsString("nonce");
        return claim != null && (claim.equals(expected) || claim.equals(sha256Hex(expected)));
    }

    static String sha256Hex(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private JwtDecoder decoder() {
        JwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                if (decoder == null) {
                    NimbusJwtDecoder built = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
                    built.setJwtValidator(validator(props.apple().audiences()));
                    decoder = built;
                }
                current = decoder;
            }
        }
        return current;
    }
}
