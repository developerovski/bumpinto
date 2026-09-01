package com.bumpinto.infra;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Component
public class TokenService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final AppProps props;
    private final Clock clock;

    public TokenService(AppProps props, Clock clock) {
        // Sirrin VARLIGI uzunluktan ayri dogrulanir: cozulmemis placeholder uzunluk esigini gecebilir.
        String configured = AppProps.required("TOKEN_SECRET", props.security().tokenSecret());
        byte[] secret = configured.getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("TOKEN_SECRET must be at least 32 bytes");
        }
        SecretKeySpec key = new SecretKeySpec(secret, "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.props = props;
        this.clock = clock;
    }

    public String issueAccessToken(UUID userId, String email) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(now)
                .expiresAt(now.plus(props.security().tokenTtl()))
                .build();
        return encoder.encode(JwtEncoderParameters
                .from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    public JwtDecoder decoder() {
        return decoder;
    }
}
