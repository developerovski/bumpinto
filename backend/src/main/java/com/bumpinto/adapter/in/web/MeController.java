package com.bumpinto.adapter.in.web;

import com.bumpinto.application.user.AccountDeletion;
import com.bumpinto.application.user.UserDataExport;
import com.bumpinto.infra.security.AuthCookies;
import com.bumpinto.infra.security.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import java.time.Clock;
import com.bumpinto.application.user.UserConsents;
import com.bumpinto.domain.user.Consents;
import com.bumpinto.application.user.UserPreferences;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/me")
class MeController {

    private final UserProfileQueries queries;
    private final UserPreferences prefs;
    private final UserConsents consents;
    private final TokenService tokens;
    private final AccountDeletion deletion;
    private final UserDataExport exports;
    private final AuthCookies cookies;
    private final Clock clock;

    MeController(UserProfileQueries queries, UserPreferences prefs, UserConsents consents,
                 TokenService tokens, AccountDeletion deletion, UserDataExport exports,
                 AuthCookies cookies, Clock clock) {
        this.queries = queries;
        this.prefs = prefs;
        this.consents = consents;
        this.tokens = tokens;
        this.deletion = deletion;
        this.exports = exports;
        this.cookies = cookies;
        this.clock = clock;
    }

    @GetMapping
    ApiDtos.MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return toResponse(queries.me(WebPrincipals.accountId(jwt)));
    }

    @PutMapping
    ApiDtos.MeResponse update(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.UpdateMeRequest request) {
        UUID id = WebPrincipals.accountId(jwt);
        ApiDtos.LocationPrefDto location = request.defaultLocation();
        prefs.update(id, request.displayName(),
                location == null ? null : new GeoPoint(location.lat(), location.lng()),
                location == null ? null : location.label(),
                request.defaultActivity(), request.language(), request.defaultTravelMode(),
                request.interests());
        return toResponse(queries.me(id));
    }

    @PutMapping("/consents")
    ApiDtos.ConsentsDto consents(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.UpdateConsentsRequest request) {
        return toDto(consents.update(WebPrincipals.accountId(jwt), request.location(),
                request.microphone(), request.analytics()));
    }

    /**
     * Tek istek, indirilebilir dosya. Hiz siniri kullanim durumunun ICINDEDIR
     * ({@code UserDataExport}, hesap basina 1/saat): kural hesap kimligini ister, filtre ise
     * guvenlik zincirinden once kosar ve yalniz IP'yi bilir (K-B34). Kontrolor ince kalir.
     */
    @GetMapping("/export")
    ResponseEntity<ApiDtos.ExportResponse> export(@AuthenticationPrincipal Jwt jwt) {
        UserDataExport.Export data = exports.of(WebPrincipals.accountId(jwt));
        String filename = "bumpinto-export-" + data.exportedAt().toString().substring(0, 10)
                + ".json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new ApiDtos.ExportResponse(data.exportedAt(), data.profile(),
                        data.participations()));
    }

    @PostMapping("/delete-token")
    ApiDtos.DeleteTokenResponse deleteToken(@AuthenticationPrincipal Jwt jwt) {
        UUID id = WebPrincipals.accountId(jwt);
        return new ApiDtos.DeleteTokenResponse(tokens.issueDeleteToken(id),
                clock.instant().plus(TokenService.DELETE_TTL));
    }

    /**
     * Silme hesabin KENDI onayini ister: tek tikla (ya da yanlislikla) hesap gitmez. Kurulumsuz
     * web akisi (R-B3) da bu jetonu kullanir — uygulama gerekmez.
     */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(HttpServletRequest http, HttpServletResponse response,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.DeleteAccountRequest request) {
        UUID id = WebPrincipals.accountId(jwt);
        if (!tokens.isDeleteTokenFor(request.deleteConfirmToken(), id)) {
            throw new IllegalArgumentException("invalid delete confirmation");
        }
        deletion.delete(id);
        // Tarayicidaki her sey gider: hesap cerezi + bu tarayicidaki tum katilimci cerezleri.
        response.addHeader(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString());
        cookies.clearParticipants(http)
                .forEach(c -> response.addHeader(HttpHeaders.SET_COOKIE, c.toString()));
    }

    static ApiDtos.ConsentsDto toDto(Consents c) {
        return new ApiDtos.ConsentsDto(c.location(), c.microphone(), c.analytics(),
                c.updatedAt(), c.version());
    }

    private static ApiDtos.MeResponse toResponse(UserProfileQueries.Me me) {
        UserProfile profile = me.profile();
        ApiDtos.LocationPrefDto location = profile.defaultLocation() == null ? null
                : new ApiDtos.LocationPrefDto(profile.defaultLocation().lat(),
                        profile.defaultLocation().lng(), profile.defaultLocationLabel());
        return new ApiDtos.MeResponse(profile.id(), profile.email(), profile.name(), location,
                profile.defaultActivity(), profile.language(), profile.defaultTravelMode(),
                new ApiDtos.StatsDto(me.stats().sessionsHosted(), me.stats().friendsMet(),
                        me.stats().plansMet(), me.stats().metStreakWeeks()),
                profile.authProviders().stream().sorted().toList(), toDto(profile.consents()),
                profile.interests());
    }
}
