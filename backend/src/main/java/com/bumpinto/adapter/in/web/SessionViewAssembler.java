package com.bumpinto.adapter.in.web;

import com.bumpinto.application.SessionQueries;
import com.bumpinto.domain.geo.GeoMath;
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
                        p.hasLocation(), p.deckDone()))
                .toList();
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            Map<UUID, Integer> travel = new LinkedHashMap<>();
            located.forEach(p -> travel.put(p.id(), TravelEstimate
                    .fromCrowKm(GeoMath.distanceKm(p.location(), v.location())).minutes()));
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), v.deckOrder(), travel);
        }).toList();
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally());
    }
}
