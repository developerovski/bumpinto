package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.UnauthorizedException;
import com.bumpinto.application.error.UnavailableException;
import com.bumpinto.application.user.AccountIdentity;
import com.bumpinto.application.user.RefreshTokens;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.infra.security.AppleIdVerifier;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.TokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    record LoginResponse(String accessToken, String refreshToken, Instant expiresAt, UUID userId) {

        @Override
        public String toString() {
            return "LoginResponse[accessToken=" + ApiDtos.masked(accessToken)
                    + ", refreshToken=" + ApiDtos.masked(refreshToken)
                    + ", expiresAt=" + expiresAt + ", userId=" + userId + "]";
        }
    }

    /** Mobil govdesi (yenileme ve cikis). Web'de bos gelir: jeton cerezden okunur. */
    record RefreshRequest(String refreshToken) {

        @Override
        public String toString() {
            return "RefreshRequest[refreshToken=" + ApiDtos.masked(refreshToken) + "]";
        }
    }

    /** §2: {identityToken, nonce?, fullName?}; authorizationCode opsiyonel, yalniz revoke icin. */
    record AppleLoginRequest(@NotBlank String identityToken, String nonce,
                             @Size(max = 80) String fullName, String authorizationCode) {

        @Override
        public String toString() {
            return "AppleLoginRequest[identityToken=" + ApiDtos.masked(identityToken)
                    + ", nonce=" + ApiDtos.masked(nonce) + ", fullName=" + fullName
                    + ", authorizationCode=" + ApiDtos.masked(authorizationCode) + "]";
        }
    }

    private final GoogleIdVerifier google;
    private final AppleIdVerifier appleVerifier;
    private final AccountIdentity identity;
    private final UserStorePort users;
    private final TokenService tokens;
    private final RefreshTokens refreshTokens;
    private final AuthCookies cookies;
    private final AppProps props;
    private final Clock clock;

    AuthController(GoogleIdVerifier google, AppleIdVerifier appleVerifier,
                   AccountIdentity identity, UserStorePort users, TokenService tokens,
                   RefreshTokens refreshTokens, AuthCookies cookies, AppProps props, Clock clock) {
        this.google = google;
        this.appleVerifier = appleVerifier;
        this.identity = identity;
        this.users = users;
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
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
        return respond(http, userId, verified.email(), client);
    }

    /** App Store 4.8: Google girisi sunan uygulama esdeger bir alternatif sunmali. */
    @PostMapping("/apple")
    ResponseEntity<LoginResponse> apple(HttpServletRequest http,
            @Valid @RequestBody AppleLoginRequest request,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        if (!appleVerifier.configured()) {
            throw new UnavailableException("apple_not_configured");
        }
        AppleIdVerifier.AppleUser verified =
                appleVerifier.verify(request.identityToken(), request.nonce());
        // Apple adi YALNIZ ilk giriste gonderir; sonraki girislerde null gelir, mevcut ad korunur.
        UUID userId = identity.upsertApple(verified.sub(), verified.email(), request.fullName(),
                request.authorizationCode());
        return respond(http, userId, verified.email(), client);
    }

    /** Iki giris ucunun ORTAK kuyrugu: token uretimi + web cerez davranisi birebir ayni. */
    private ResponseEntity<LoginResponse> respond(HttpServletRequest http, UUID userId,
                                                  String email, String client) {
        boolean web = isWeb(client);
        String accessToken = tokens.issueAccessToken(userId, email);
        // Giris = YENI aile: her cihaz kendi rotasyon zincirini tasir.
        RefreshTokens.Issued refresh = refreshTokens.issue(userId, clientTag(client));
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if (web) {
            ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .header(HttpHeaders.SET_COOKIE, cookies
                            .refresh(refresh.token(), props.security().refreshTtl()).toString());
            // Tarayicidaki hesap DEGISTIYSE onceki kimlige yazilmis katilimci cerezleri de gider.
            if (signedInAsSomeoneElse(http, userId)) {
                setCookies(response, cookies.clearParticipants(http));
            }
            return response.body(new LoginResponse(null, null, expiresAt, userId));
        }
        return ResponseEntity.ok(
                new LoginResponse(accessToken, refresh.token(), expiresAt, userId));
    }

    /**
     * PUBLIC uc: cagiranin erisim jetonu TANIM GEREGI olu, kimlik dogrulamasi yenileme
     * jetonunun KENDISIDIR (sunucu onu DB'deki ozetle eslestirir).
     *
     * <p>Rotasyon TEK KULLANIMLIK: donen jeton yeni, eski aninda iptal. Istemcinin iki
     * yenilemeyi PARALEL atmamasi bu yuzden onemli — ikincisi "yeniden kullanim" sayilip
     * AILEYI kapatir; tek-ucuslu kesici (W-16/M-10) tam olarak bunu garanti eder.
     */
    @PostMapping("/refresh")
    ResponseEntity<LoginResponse> refresh(HttpServletRequest http,
            @RequestBody(required = false) RefreshRequest body,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        boolean web = isWeb(client);
        String presented = web ? refreshCookie(http) : bodyToken(body);
        RefreshTokens.Rotation rotated = refreshTokens.rotate(presented, clientTag(client))
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token"));

        // Silinmis hesap yeniden jeton alamaz. AccountDeletion aileyi zaten iptal eder; bu,
        // yarisi kaybeden bir istegin kapanmis hesaba erisim jetonu basmasini engelleyen
        // IKINCI kapi.
        UserProfile profile = users.profileOf(rotated.userId())
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token"));

        String accessToken = tokens.issueAccessToken(profile.id(), profile.email());
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if (web) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .header(HttpHeaders.SET_COOKIE, cookies
                            .refresh(rotated.token(), props.security().refreshTtl()).toString())
                    .body(new LoginResponse(null, null, expiresAt, profile.id()));
        }
        return ResponseEntity.ok(
                new LoginResponse(accessToken, rotated.token(), expiresAt, profile.id()));
    }

    private static boolean isWeb(String client) {
        return "web".equalsIgnoreCase(client);
    }

    /** refresh_tokens.client: yalniz teshis/gunluk icin, yetki karari VERMEZ. */
    private static String clientTag(String client) {
        return isWeb(client) ? "web" : "mobile";
    }

    private static String bodyToken(RefreshRequest body) {
        return body == null ? null : body.refreshToken();
    }

    private static String refreshCookie(HttpServletRequest http) {
        return cookieValue(http, AuthCookies.REFRESH);
    }

    /** Kimlik gerekmez: suresi dolmus cerezle de cikis yapilabilmeli. */
    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest http,
            @RequestBody(required = false) RefreshRequest body) {
        // Yenileme jetonu tarayicida CEREZDE, mobilde GOVDEDE gelir; hangisi geldiyse ailesi
        // kapanir. Iptal edilmezse "cikis yaptim" diyen kullanicinin jetonu 30 gun daha
        // erisim jetonu bastirabilirdi.
        String presented = bodyToken(body) != null ? bodyToken(body) : refreshCookie(http);
        refreshTokens.revokeFamilyOf(presented);

        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString());
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
        return cookieValue(http, AuthCookies.ACCESS);
    }

    private static String cookieValue(HttpServletRequest http, String name) {
        if (http.getCookies() == null) {
            return null;
        }
        return Arrays.stream(http.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
