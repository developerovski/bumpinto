package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
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
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Component
public class TokenService {

    /** Token TIPI: tek TOKEN_SECRET iki tur token imzaliyor, birbirinin yerine gecemezler. */
    public static final String TYPE_CLAIM = "typ";
    public static final String PARTICIPANT_TYPE = "pt";
    public static final String SESSION_CLAIM = "sid";
    public static final String SLUG_CLAIM = "slug";
    public static final String HOST_CLAIM = "host";
    /** Oturumu KURAN hesabin id'si: filtre "bu tarayicidaki hesap oturumun sahibi mi"yi DB'siz sorar. */
    public static final String HOST_USER_CLAIM = "huid";

    /** Katilimci token'i oturumun kendisi kadar (24s) yasar; cerez Max-Age'i ile ayni kaynak. */
    public static final Duration PARTICIPANT_TTL = Duration.ofHours(24);

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

    /**
     * Katilimci kimligi: oturuma kapsamli, imzali, DB'siz. Onceden 32 baytlik OPAK bir sirdi ve
     * her istekte participants tablosundan okunuyordu; hem istek basina iki sorgu hem de
     * veritabaninda duz metin bir bearer sirri demekti. Iptal kaybi yok: uygulama katmani her
     * yazmada katilimciyi zaten dogruluyor (DeckFlow.requireMember, SessionCommands.updateLocation).
     *
     * <p>{@code typ=pt}: hesap token'i ile AYNI sir imzaladigi icin tur ayrimi sart — bu claim
     * olmasa katilimci token'i {@code Authorization: Bearer} ile hesap kimligi olarak gecerdi.
     */
    public String issueParticipantToken(UUID participantId, UUID sessionId, String slug,
                                        boolean host, UUID hostUserId) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(participantId.toString())
                .claim(SESSION_CLAIM, sessionId.toString())
                .claim(SLUG_CLAIM, slug)
                .claim(HOST_CLAIM, host)
                .claim(HOST_USER_CLAIM, hostUserId.toString())
                .claim(TYPE_CLAIM, PARTICIPANT_TYPE)
                .issuedAt(now)
                .expiresAt(now.plus(PARTICIPANT_TTL))
                .build();
        return encoder.encode(JwtEncoderParameters
                .from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    public JwtDecoder decoder() {
        return decoder;
    }
}
