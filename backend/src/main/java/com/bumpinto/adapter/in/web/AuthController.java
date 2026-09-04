package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.TokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    record GoogleLoginRequest(@NotBlank String idToken) {

        @Override
        public String toString() {
            return "GoogleLoginRequest[idToken=" + ApiDtos.masked(idToken) + "]";
        }
    }

    record LoginResponse(String accessToken, Instant expiresAt, UUID userId) {

        @Override
        public String toString() {
            return "LoginResponse[accessToken=" + ApiDtos.masked(accessToken)
                    + ", expiresAt=" + expiresAt + ", userId=" + userId + "]";
        }
    }

    private final GoogleIdVerifier google;
    private final UserStorePort users;
    private final TokenService tokens;
    private final AuthCookies cookies;
    private final AppProps props;
    private final Clock clock;

    AuthController(GoogleIdVerifier google, UserStorePort users, TokenService tokens,
                   AuthCookies cookies, AppProps props, Clock clock) {
        this.google = google;
        this.users = users;
        this.tokens = tokens;
        this.cookies = cookies;
        this.props = props;
        this.clock = clock;
    }

    @PostMapping("/google")
    ResponseEntity<LoginResponse> google(HttpServletRequest http,
            @Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        GoogleIdVerifier.GoogleUser verified = google.verify(request.idToken());
        UUID userId = users.upsertByEmail(verified.email(), verified.name());
        String accessToken = tokens.issueAccessToken(userId, verified.email());
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if ("web".equalsIgnoreCase(client)) {
            ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString());
            // Tarayicidaki hesap DEGISTIYSE onceki kimlige yazilmis katilimci cerezleri de gider.
            if (signedInAsSomeoneElse(http, userId)) {
                setCookies(response, cookies.clearParticipants(http));
            }
            return response.body(new LoginResponse(null, expiresAt, userId));
        }
        return ResponseEntity.ok(new LoginResponse(accessToken, expiresAt, userId));
    }

    /** Kimlik gerekmez: suresi dolmus cerezle de cikis yapilabilmeli. Mobil icin no-op (204). */
    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest http) {
        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString());
        // Cikis "bu tarayici artik ben degilim" demek: oturum kapsamli katilimci token'lari da
        // biter, yoksa tarayiciyi devralan kisi onlarla yazmaya devam eder.
        setCookies(response, cookies.clearParticipants(http));
        return response.build();
    }

    private static void setCookies(ResponseEntity.HeadersBuilder<?> response,
                                   List<ResponseCookie> cookies) {
        cookies.forEach(cookie -> response.header(HttpHeaders.SET_COOKIE, cookie.toString()));
    }

    /**
     * Bu tarayicida ONCEDEN baska bir hesap mi vardi? Hesap cerezi hic yoksa (anonim tarayici)
     * dokunulmaz: kisi once katilip sonra giris yapmis olabilir. Cerez cozulmuyorsa (suresi
     * dolmus / bozuk) kime ait oldugu bilinmez — fail-closed, katilimci cerezleri silinir.
     */
    private boolean signedInAsSomeoneElse(HttpServletRequest http, UUID userId) {
        String previous = accessCookie(http);
        if (previous == null) {
            return false;
        }
        try {
            return !userId.toString().equals(tokens.decoder().decode(previous).getSubject());
        } catch (JwtException stale) {
            return true;
        }
    }

    private static String accessCookie(HttpServletRequest http) {
        if (http.getCookies() == null) {
            return null;
        }
        return Arrays.stream(http.getCookies())
                .filter(cookie -> AuthCookies.ACCESS.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
