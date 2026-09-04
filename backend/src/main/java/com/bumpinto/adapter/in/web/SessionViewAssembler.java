package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.Fairness;
import com.bumpinto.domain.geo.GeoMath;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.SearchRadius;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.venue.Venue;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionViewAssembler {

    private final PresencePort presence;

    public SessionViewAssembler(PresencePort presence) {
        this.presence = presence;
    }

    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap, Authentication auth) {
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();

        // Orta nokta ONCE: katilimci satirlarindaki midpointMinutes buna dayanir.
        ApiDtos.GeoPointDto midpoint = null;
        Double radiusKm = null;
        GeoPoint center = null;
        if (located.size() >= 2) {
            List<GeoPoint> points = located.stream().map(Participant::location).toList();
            // Hiza TERS agirlik (spec §4.5b): yavas gelen orta noktayi kendine ceker.
            List<Double> weights = located.stream().map(p -> p.travelMode().weight()).toList();
            center = GeoMath.centroid(points, weights);
            midpoint = approx(center);
            radiusKm = Math.round(SearchRadius.baseKm(points, center) * 10) / 10.0;
        }
        GeoPoint midpointFor = center;
        Set<UUID> present = presence.presentIn(snap.session().id());

        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null, p.travelMode(),
                        // Orta nokta yoksa ya da kisinin konumu yoksa satir cizilmez → null.
                        midpointFor == null || !p.hasLocation() ? null
                                : TravelMinutes.between(p.location(), p.travelMode(), midpointFor),
                        present.contains(p.id())))
                .toList();

        // Elle konumlarin yol suresi de gosterilir (Bireysel'de "Ayşe 28′").
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            // Konumu olan HERKES (viewer ve elle konumlar dahil): 3. kisi asla dusmez (§4.3),
            // dakika yuvarlanmis konumdan gelir (§4.4) — TravelMinutes.byParticipant DeckFlow
            // ile AYNI kod yolu (tek kaynak, kopya kayma riski yok).
            Map<UUID, Integer> travel = TravelMinutes.byParticipant(located, v.location());
            // Hic konumlu katilimci yoksa (0,0,null) degil null: "herkes esit" YALANI yazilmaz.
            ApiDtos.FairnessDto fairness = located.isEmpty() ? null : toFairnessDto(Fairness.of(travel));
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), directionsUrl(v), v.deckOrder(),
                    travel, fairness,
                    v.provider(), v.category(), v.address(), v.locality(), v.ratingCount(),
                    v.hoursToday(), v.placeLink());
        }).toList();
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally(), midpoint, radiusKm,
                snap.runoffVotes().keySet().stream().sorted().toList(),
                WebPrincipals.viewerOf(snap, auth),
                snap.session().midpointLabel(), snap.session().decisionKind(),
                snap.session().decidedAt(), snap.session().runoffReason(), snap.likeCounts());
    }

    /** Katilmadan once gorulen kamu bilgisi: koordinat, katilimci id'si ve mekan YOK. */
    public ApiDtos.SessionPreview toPreview(SessionQueries.SessionSnapshot snap) {
        List<ApiDtos.PreviewParticipantDto> participants = snap.participants().stream()
                .filter(p -> !p.manual())
                .map(p -> new ApiDtos.PreviewParticipantDto(p.displayName(), p.host(), p.hasLocation()))
                .toList();
        String hostDisplayName = participants.stream()
                .filter(ApiDtos.PreviewParticipantDto::host)
                .findFirst().map(ApiDtos.PreviewParticipantDto::displayName).orElse(null);
        // Host'un koltuk id'si preview DTO'suna GIRMEZ; cevrimicilik domain satirindan okunur.
        Set<UUID> present = presence.presentIn(snap.session().id());
        boolean hostOnline = snap.participants().stream().filter(Participant::host).findFirst()
                .map(host -> present.contains(host.id())).orElse(false);
        return new ApiDtos.SessionPreview(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), hostDisplayName, participants.size(), participants,
                hostOnline);
    }

    public ApiDtos.SessionListResponse toList(List<SessionSummary> rows) {
        Map<Boolean, List<ApiDtos.SessionSummaryDto>> byBucket = rows.stream()
                .map(SessionViewAssembler::toSummaryDto)
                .collect(Collectors.partitioningBy(d -> d.status() == SessionStatus.DECIDED
                        || d.status() == SessionStatus.EXPIRED));
        return new ApiDtos.SessionListResponse(byBucket.get(false), byBucket.get(true));
    }

    private static ApiDtos.SessionSummaryDto toSummaryDto(SessionSummary s) {
        return new ApiDtos.SessionSummaryDto(s.session().slug(), s.session().name(),
                s.session().activityType(), s.session().sessionType(), s.session().status(),
                s.createdAt(), s.session().expiresAt(), s.participantCount(), s.readyCount(),
                s.doneCount(), s.decidedVenueName(), s.decidedVenuePhotoUrl());
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti (tek kaynak: TravelMinutes.approx). */
    static ApiDtos.GeoPointDto approx(GeoPoint p) {
        GeoPoint rounded = TravelMinutes.approx(p);
        return new ApiDtos.GeoPointDto(rounded.lat(), rounded.lng());
    }

    /** Saglayici mapsUrl vermediyse API'siz yol tarifi adresi (spec §5.A.6). */
    private static String directionsUrl(Venue v) {
        if (v.mapsUrl() != null && !v.mapsUrl().isBlank()) {
            return v.mapsUrl();
        }
        return "https://www.google.com/maps/dir/?api=1&destination="
                + v.location().lat() + "," + v.location().lng();
    }

    private static ApiDtos.FairnessDto toFairnessDto(Fairness f) {
        return new ApiDtos.FairnessDto(f.maxMinutes(), f.spreadMinutes(), f.longestParticipantId());
    }
}
