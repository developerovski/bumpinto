package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SeatRequests;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.SeatRequest;
import com.bumpinto.domain.session.SeatStatus;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Acik plana katilim istekleri.
 *
 * <p><b>Kimlik burada HESAP JWT'sidir, katilimci token'i DEGIL</b> — "oturum uclarinda kimlik
 * katilimci token'idir" kuralinin (ARCHITECTURE §8) bilincli istisnasi. Gerekcesi: isteyen
 * henuz katilimci DEGILDIR (koltugu yok, token'i da yok) ve host karari Kesfet'ten gelen
 * hesapli kullaniciyla ilgilidir. Koltuk ancak onaydan SONRA dogar.
 */
@RestController
@RequestMapping("/api/sessions/{slug}/seat-requests")
class SeatRequestController {

    private final SeatRequests seats;
    private final SessionQueries queries;
    private final UserProfileQueries profiles;
    private final SessionViewAssembler assembler;
    private final ParticipantTokenDelivery tokens;

    SeatRequestController(SeatRequests seats, SessionQueries queries, UserProfileQueries profiles,
                          SessionViewAssembler assembler, ParticipantTokenDelivery tokens) {
        this.seats = seats;
        this.queries = queries;
        this.profiles = profiles;
        this.assembler = assembler;
        this.tokens = tokens;
    }

    @PostMapping
    ResponseEntity<ApiDtos.SeatRequestDto> request(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug, @Valid @RequestBody ApiDtos.SeatRequestInput body) {
        GeoPoint location = body.lat() == null || body.lng() == null ? null
                : new GeoPoint(body.lat(), body.lng());
        SeatRequest r = seats.request(slug, new SeatRequests.Ask(WebPrincipals.accountId(jwt),
                body.displayName(), location, body.locationLabel(), body.travelMode(),
                body.note()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(r));
    }

    @GetMapping
    ApiDtos.SeatRequestListResponse list(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug) {
        return listFor(slug, WebPrincipals.accountId(jwt));
    }

    /**
     * Isteyenin KENDI durumu. Onaylandiysa katilimci token'i AYNI teslim kuralindan gecer:
     * web'de cookie, mobilde govde (ParticipantTokenDelivery) — ikinci bir kanal acilmaz.
     */
    @GetMapping("/mine")
    ResponseEntity<ApiDtos.MySeatResponse> mine(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        UUID me = WebPrincipals.accountId(jwt);
        SeatRequest r = seats.mine(slug, me)
                .orElseThrow(() -> new com.bumpinto.application.error.NotFoundException(
                        "seat request not found"));
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        String token = null;
        if (r.status() == SeatStatus.APPROVED) {
            SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
            token = snap.participants().stream().filter(p -> me.equals(p.userId())).findFirst()
                    .map(seat -> tokens.deliver(response, client, slug, seat)).orElse(null);
        }
        return response.body(new ApiDtos.MySeatResponse(r.status(), token));
    }

    @PostMapping("/{requestId}/approve")
    ApiDtos.SeatRequestListResponse approve(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug, @PathVariable UUID requestId) {
        UUID host = WebPrincipals.accountId(jwt);
        seats.approve(slug, host, requestId);
        return listFor(slug, host);
    }

    @PostMapping("/{requestId}/decline")
    ApiDtos.SeatRequestListResponse decline(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug, @PathVariable UUID requestId) {
        UUID host = WebPrincipals.accountId(jwt);
        seats.decline(slug, host, requestId);
        return listFor(slug, host);
    }

    /** Karar uclari da GUNCEL listeyi doner: host paneli ikinci bir GET atmaz. */
    private ApiDtos.SeatRequestListResponse listFor(String slug, UUID host) {
        SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
        ApiDtos.OpenPlanDto plan = assembler.openPlanDto(snap.session(), snap.participants());
        return new ApiDtos.SeatRequestListResponse(
                seats.forSession(slug, host).stream().map(this::toDto).toList(),
                plan.approvedSeats(), plan.capacity(), plan.confirmed());
    }

    /**
     * Koordinat DTO'ya GIRMEZ: host'un gordugu tek yer bilgisi isteyenin kendi yazdigi semt
     * etiketidir. Dakika bu ucta hesaplanmaz — kart zaten Kesfet'te gosterilmisti.
     */
    private ApiDtos.SeatRequestDto toDto(SeatRequest r) {
        return new ApiDtos.SeatRequestDto(r.id(), r.displayName(), r.locationLabel(), null,
                r.travelMode(), r.note(), r.status(), r.createdAt(),
                profiles.me(r.userId()).profile().interests());
    }
}
