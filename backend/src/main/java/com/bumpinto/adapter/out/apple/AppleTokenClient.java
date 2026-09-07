package com.bumpinto.adapter.out.apple;

import com.bumpinto.domain.port.AppleTokensPort;
import com.bumpinto.infra.config.AppProps;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

/**
 * Apple token ucu. Client secret bir ES256 JWT'dir: iss=Team ID, sub=Services ID,
 * aud=https://appleid.apple.com, kid=Key ID, imza AuthKey p8 ile. IKI cagri da FAIL-OPEN
 * (AppleTokensPort): Apple'in erisilemez olmasi ne girisi ne de hesap silmeyi bloklar.
 */
@Component
class AppleTokenClient implements AppleTokensPort {

    private static final Logger log = LoggerFactory.getLogger(AppleTokenClient.class);
    private static final String TOKEN_URL = "https://appleid.apple.com/auth/token";
    private static final String REVOKE_URL = "https://appleid.apple.com/auth/revoke";
    private static final Duration SECRET_TTL = Duration.ofMinutes(10);

    private final UnirestInstance http;
    private final AppProps props;

    AppleTokenClient(UnirestInstance http, AppProps props) {
        this.http = http;
        this.props = props;
    }

    @Override
    public Optional<String> exchangeRefreshToken(String authorizationCode) {
        if (!props.apple().configured() || authorizationCode == null) {
            return Optional.empty();
        }
        try {
            HttpResponse<JsonNode> response = http.post(TOKEN_URL)
                    .field("client_id", props.apple().servicesId())
                    .field("client_secret", clientSecret())
                    .field("code", authorizationCode)
                    .field("grant_type", "authorization_code")
                    .asJson();
            if (!response.isSuccess()) {
                log.warn("apple token exchange failed: {}", response.getStatus());
                return Optional.empty();
            }
            return Optional.ofNullable(response.getBody().getObject()
                    .optString("refresh_token", null)).filter(t -> !t.isBlank());
        } catch (RuntimeException unreachable) {
            log.warn("apple token exchange unreachable: {}", unreachable.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void revoke(String refreshToken) {
        if (!props.apple().configured() || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            http.post(REVOKE_URL)
                    .field("client_id", props.apple().servicesId())
                    .field("client_secret", clientSecret())
                    .field("token", refreshToken)
                    .field("token_type_hint", "refresh_token")
                    .asEmpty();
        } catch (RuntimeException unreachable) {
            log.warn("apple revoke unreachable: {}", unreachable.getMessage());
        }
    }

    private String clientSecret() {
        try {
            Instant now = Instant.now();
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(props.apple().keyId())
                            .type(JOSEObjectType.JWT).build(),
                    new JWTClaimsSet.Builder().issuer(props.apple().teamId())
                            .subject(props.apple().servicesId())
                            .audience("https://appleid.apple.com")
                            .issueTime(Date.from(now))
                            .expirationTime(Date.from(now.plus(SECRET_TTL))).build());
            jwt.sign(new ECDSASigner(privateKey()));
            return jwt.serialize();
        } catch (Exception badKey) {
            throw new IllegalStateException("APPLE_PRIVATE_KEY is not a valid PKCS#8 EC key", badKey);
        }
    }

    private ECPrivateKey privateKey() throws Exception {
        String pem = props.apple().privateKey()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "").replaceAll("\\s", "");
        return (ECPrivateKey) KeyFactory.getInstance("EC")
                .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem)));
    }
}
