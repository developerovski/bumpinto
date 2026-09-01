package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.TokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;
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
    ResponseEntity<LoginResponse> google(@Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        GoogleIdVerifier.GoogleUser verified = google.verify(request.idToken());
        UUID userId = users.upsertByEmail(verified.email(), verified.name());
        String accessToken = tokens.issueAccessToken(userId, verified.email());
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if ("web".equalsIgnoreCase(client)) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .body(new LoginResponse(null, expiresAt, userId));
        }
        return ResponseEntity.ok(new LoginResponse(accessToken, expiresAt, userId));
    }
}
