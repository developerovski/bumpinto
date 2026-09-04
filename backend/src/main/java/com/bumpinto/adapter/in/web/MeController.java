package com.bumpinto.adapter.in.web;

import com.bumpinto.application.user.UserPreferences;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
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

    MeController(UserProfileQueries queries, UserPreferences prefs) {
        this.queries = queries;
        this.prefs = prefs;
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
                request.defaultActivity(), request.language(), request.defaultTravelMode());
        return toResponse(queries.me(id));
    }

    private static ApiDtos.MeResponse toResponse(UserProfileQueries.Me me) {
        UserProfile profile = me.profile();
        ApiDtos.LocationPrefDto location = profile.defaultLocation() == null ? null
                : new ApiDtos.LocationPrefDto(profile.defaultLocation().lat(),
                        profile.defaultLocation().lng(), profile.defaultLocationLabel());
        return new ApiDtos.MeResponse(profile.id(), profile.email(), profile.name(), location,
                profile.defaultActivity(), profile.language(), profile.defaultTravelMode(),
                new ApiDtos.StatsDto(me.stats().sessionsHosted(), me.stats().friendsMet()));
    }
}
