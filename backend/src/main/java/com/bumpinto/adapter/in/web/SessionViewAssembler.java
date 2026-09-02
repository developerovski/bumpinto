package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoMath;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.SearchRadius;
import com.bumpinto.domain.geo.TravelEstimate;
import com.bumpinto.domain.session.Participant;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class SessionViewAssembler {

    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap) {
        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null))
                .toList();
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();
        // Elle konumlarin yol suresi de gosterilir (Bireysel'de "Ayşe 28′").
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            Map<UUID, Integer> travel = new LinkedHashMap<>();
            located.forEach(p -> travel.put(p.id(),
                    TravelEstimate.fromCrowKm(GeoMath.distanceKm(p.location(), v.location())).minutes()));
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), v.deckOrder(), travel);
        }).toList();
        ApiDtos.GeoPointDto midpoint = null;
        Double radiusKm = null;
        if (located.size() >= 2) {
            List<GeoPoint> points = located.stream().map(Participant::location).toList();
            GeoPoint center = GeoMath.centroid(points);
            midpoint = approx(center);
            radiusKm = Math.round(SearchRadius.baseKm(points, center) * 10) / 10.0;
        }
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally(), midpoint, radiusKm,
                snap.voters().stream().sorted().toList());
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti. */
    static ApiDtos.GeoPointDto approx(GeoPoint p) {
        return new ApiDtos.GeoPointDto(Math.round(p.lat() * 100) / 100.0,
                Math.round(p.lng() * 100) / 100.0);
    }
}
