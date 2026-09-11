package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.DiscoverQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Kesfet. Kimlik ZORUNLU (hesap JWT'si): liste yabancilarin planlarini gosteriyor ve engel
 * suzgeci "kim bakiyor" bilgisine dayaniyor — anonim bir cagiran icin engel diye bir sey yok
 * ve liste bir kazima yuzeyine donerdi.
 */
@RestController
@RequestMapping("/api/discover")
class DiscoverController {

    private final DiscoverQueries discover;
    private final UserProfileQueries profiles;
    private final SessionViewAssembler assembler;

    DiscoverController(DiscoverQueries discover, UserProfileQueries profiles,
                       SessionViewAssembler assembler) {
        this.discover = discover;
        this.profiles = profiles;
        this.assembler = assembler;
    }

    /**
     * Filtre verilmezse profil ILGI ALANLARI kullanilir (V21) ve cevapta geri doner: istemci
     * "hangi filtreyle bakiyorum"u sunucudan ogrenir, kendi varsayilanini uydurmaz.
     */
    @GetMapping
    ApiDtos.DiscoverResponse list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "activity", required = false) List<ActivityType> activity,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) TravelMode travelMode) {
        UUID me = WebPrincipals.accountId(jwt);
        Set<ActivityType> filter = activity == null || activity.isEmpty()
                ? Set.copyOf(profiles.me(me).profile().interests())
                : Set.copyOf(activity);
        GeoPoint location = lat == null || lng == null ? null : new GeoPoint(lat, lng);
        return assembler.toDiscover(discover.list(me, filter, location, travelMode), filter,
                travelMode);
    }
}
