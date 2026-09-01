package com.bumpinto.infra;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GoogleIdVerifier {

    static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    static final String ISSUER = "https://accounts.google.com";

    private final JwtDecoder googleDecoder;

    /** Iki ctor var; isaretlenmezse Spring hicbirini secemez ve no-arg arayip acilista patlar. */
    @Autowired
    public GoogleIdVerifier(AppProps props) {
        this(props, NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build());
    }

    /** Test kancasi: ayni dogrulayici zinciri, aga cikmayan bir decoder uzerinde kurulur. */
    GoogleIdVerifier(AppProps props, NimbusJwtDecoder decoder) {
        // Eksik client-id fail-closed'dir (hicbir audience eslesmez) ama arıza calisma zamanina
        // ertelenirdi; TOKEN_SECRET ile ayni muamele: yanlis ayarli deploy hic ayaga kalkmaz.
        decoder.setJwtValidator(
                validator(AppProps.required("GOOGLE_CLIENT_ID", props.security().googleClientId())));
        this.googleDecoder = decoder;
    }

    static OAuth2TokenValidator<Jwt> validator(String googleClientId) {
        OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(googleClientId)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "audience mismatch", null));
        };
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ISSUER), audienceCheck);
    }

    public record GoogleUser(String email, String name) {
    }

    public GoogleUser verify(String idToken) {
        Jwt jwt = googleDecoder.decode(idToken);
        return new GoogleUser(jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
    }
}
