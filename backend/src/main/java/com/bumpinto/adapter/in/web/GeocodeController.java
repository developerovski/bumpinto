package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.GeocodePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Geocode SUNUCUDA: politika, User-Agent, throttle ve onbellek tek yerde. Hesap JWT'si ya da katilimci token'i yeter. */
@RestController
@RequestMapping("/api/geocode")
public class GeocodeController {

    private final GeocodePort forward;
    private final ReverseGeocodePort reverse;

    public GeocodeController(GeocodePort forward, ReverseGeocodePort reverse) {
        this.forward = forward;
        this.reverse = reverse;
    }

    @PostMapping
    public ResponseEntity<ApiDtos.GeocodeResponse> forward(@Valid @RequestBody ApiDtos.GeocodeRequest request) {
        GeoPoint bias = request.biasLat() == null || request.biasLng() == null ? null
                : new GeoPoint(request.biasLat(), request.biasLng());
        return forward.forward(request.query(), bias)
                .map(r -> ResponseEntity.ok(new ApiDtos.GeocodeResponse(r.point().lat(), r.point().lng(), r.label())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Etiket bulunamamasi HATA DEGIL: {label: null} doner, cagiran satiri gizler. */
    @PostMapping("/reverse")
    public ApiDtos.ReverseGeocodeResponse reverse(@Valid @RequestBody ApiDtos.ReverseGeocodeRequest request) {
        return new ApiDtos.ReverseGeocodeResponse(reverse.label(new GeoPoint(request.lat(), request.lng())).orElse(null));
    }
}
