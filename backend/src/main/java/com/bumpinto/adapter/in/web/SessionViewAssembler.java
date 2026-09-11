package com.bumpinto.adapter.in.web;

import com.bumpinto.application.safety.Blocks;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.application.session.DiscoverQueries;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.Fairness;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.MapLinks;
import com.bumpinto.domain.geo.SessionCenter;
import com.bumpinto.domain.geo.TravelLeg;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.PresenceStampsPort;
import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.voice.VoiceRoom;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionViewAssembler {

    /** Damgasi hic olmayan koltuk icin iki null: haritada anahtar YOK demek "hic gorulmedi". */
    private static final PresenceStampsPort.Stamps EMPTY_STAMPS =
            new PresenceStampsPort.Stamps(null, null);

    private final PresencePort presence;
    private final VoiceRoomsPort rooms;
    private final RoutingPort routing;
    private final Blocks blocks;
    private final PresenceStampsPort stamps;
    private final Clock clock;

    public SessionViewAssembler(PresencePort presence, VoiceRoomsPort rooms, RoutingPort routing,
                                Blocks blocks, PresenceStampsPort stamps, Clock clock) {
        this.presence = presence;
        this.rooms = rooms;
        this.routing = routing;
        this.blocks = blocks;
        this.stamps = stamps;
        this.clock = clock;
    }

    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap, Authentication auth) {
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();

        // Orta nokta ONCE: katilimci satirlarindaki midpointMinutes buna dayanir.
        SessionCenter center = SessionCenter.of(snap.session().anchor(), located);
        // Capali merkez YUVARLANMAZ: yuvarlama gizlilik onlemidir ve capa kamu bilgisidir.
        ApiDtos.GeoPointDto midpoint = center == null ? null
                : center.anchored()
                        ? new ApiDtos.GeoPointDto(center.point().lat(), center.point().lng())
                        : approx(center.point());
        Double radiusKm = center == null ? null : Math.round(center.radiusKm() * 10) / 10.0;
        GeoPoint midpointFor = center == null ? null : center.point();
        Set<UUID> present = presence.presentIn(snap.session().id());
        // "Su an burada" ile "en son ne zaman buradaydi" AYRI kaynaklardir: ilki surec icinde
        // yasar ve grace penceresinden sonra unutulur, ikincisi kalicidir.
        Map<UUID, PresenceStampsPort.Stamps> marks = stamps.stampsOf(snap.session().id());
        Optional<VoiceRoom> room = rooms.roomOf(snap.session().id());
        ApiDtos.ViewerDto viewer = WebPrincipals.viewerOf(snap, auth);
        // Uye degilse (link'i acan ama katilmamis biri) arac varsayilanina duser: CAR.
        TravelMode viewerMode = viewer == null ? TravelMode.CAR
                : snap.participants().stream().filter(p -> p.id().equals(viewer.participantId()))
                        .findFirst().map(Participant::travelMode).orElse(TravelMode.CAR);

        // Engel TEK YONLU: yalniz GORUNTULEYENIN engelledikleri isaretlenir.
        Set<UUID> hidden = blocks.hiddenParticipantIds(WebPrincipals.accountIdOrNull(auth),
                snap.session().id(), snap.participants());

        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null, p.travelMode(),
                        // Orta nokta yoksa ya da kisinin konumu yoksa satir cizilmez → null.
                        midpointFor == null || !p.hasLocation() ? null
                                : TravelMinutes.between(p.location(), p.travelMode(), midpointFor),
                        present.contains(p.id()),
                        room.map(r -> r.hasMember(p.id())).orElse(false),
                        hidden.contains(p.id()),
                        marks.getOrDefault(p.id(), EMPTY_STAMPS).lastSeenAt(),
                        marks.getOrDefault(p.id(), EMPTY_STAMPS).linkOpenedAt()))
                .toList();

        // Elle konumlarin yol suresi de gosterilir (Bireysel'de "Ayşe 28′").
        // Oturum basina MOD basina TEK matris: OSRM burada bir kez sorulur, mekan basina degil.
        List<GeoPoint> venuePoints = snap.venues().stream().map(Venue::location).toList();
        List<Map<UUID, TravelLeg>> legs = located.isEmpty() ? List.of()
                : TravelMinutes.byParticipant(located, venuePoints, routing);
        List<ApiDtos.VenueDto> venues = new ArrayList<>();
        for (int i = 0; i < snap.venues().size(); i++) {
            Venue v = snap.venues().get(i);
            Map<UUID, TravelLeg> leg = legs.isEmpty() ? Map.of() : legs.get(i);
            // Eski sozlesme korunur: dakika haritasi hala Integer.
            Map<UUID, Integer> travelMinutes = new LinkedHashMap<>();
            leg.forEach((id, l) -> travelMinutes.put(id, l.minutes()));
            // Hic konumlu katilimci yoksa (0,0,null) degil null: "herkes esit" YALANI yazilmaz.
            ApiDtos.FairnessDto fairness = located.isEmpty() ? null : toFairnessDto(Fairness.of(travelMinutes));
            List<ApiDtos.TravelDto> travel = leg.entrySet().stream()
                    .map(e -> new ApiDtos.TravelDto(e.getKey(), e.getValue().minutes(), e.getValue().estimated()))
                    .toList();
            String mapsUrl = MapLinks.directions(v.location().lat(), v.location().lng(), viewerMode);
            venues.add(new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), mapsUrl, v.deckOrder(),
                    travelMinutes, fairness,
                    v.provider(), v.category(), v.address(), v.locality(), v.ratingCount(),
                    v.hoursToday(), v.placeLink(), v.activityType(),
                    v.popularity(), v.ratingScale(), travel, v.tagline(), v.taglineSource()));
        }
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityTypes(), snap.session().sessionType(),
                snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally(), midpoint, radiusKm,
                snap.runoffVotes().keySet().stream().sorted().toList(),
                viewer,
                snap.session().midpointLabel(), snap.session().decisionKind(),
                snap.session().decidedAt(), snap.session().runoffReason(), snap.likeCounts(),
                emptyActivityTypes(snap), center != null && center.anchored(),
                room.map(r -> new ApiDtos.VoiceDto(r.endsAt())).orElse(null),
                // Uc zaten uye olmayana 403 veriyor; alan yine de viewer'a bagli — savunma tek
                // satirdir ve kodun kime gittigini kodun kendisi soyler.
                viewer == null ? null : snap.session().joinCode(),
                openPlanDto(snap.session(), snap.participants()));
    }

    /**
     * Acik planin okuma yuzu. {@code approvedSeats} ve {@code confirmed} TURETILIR: sayilan
     * degeri saklamak, koltuk eklendikce bayatlayan ikinci bir gercek yaratirdi.
     */
    ApiDtos.OpenPlanDto openPlanDto(Session session, List<Participant> participants) {
        OpenPlan plan = session.openPlan();
        if (plan == null) {
            return null;
        }
        int approved = (int) participants.stream()
                .filter(p -> !p.manual() && p.userId() != null).count();
        return new ApiDtos.OpenPlanDto(plan.meetAt(), plan.capacity(), plan.joinPolicy(),
                approved, plan.confirmed(approved), plan.meetPassed(clock.instant()));
    }

    /**
     * Secili ama desteye tek mekan sokamamis alanlar. TURETILIR, depolanmaz: deste zaten
     * elimizde ve tek kaynak odur. Deste kurulmadan once (BROWSING oncesi) bos doner --
     * yoksa "hicbir sey bulunamadi" gibi okunurdu.
     */
    private static List<ActivityType> emptyActivityTypes(SessionQueries.SessionSnapshot snap) {
        if (snap.venues().isEmpty()) {
            return List.of();
        }
        Set<ActivityType> covered = snap.venues().stream().map(Venue::activityType)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        // HICBIR mekan atfedilememisse "hepsi bos" DENMEZ: elde deste var, yalniz atif
        // sinyali yok (saglayici tur takma adi). "20 kahve mekani + kahve bulunamadi"
        // ekranda apacik bir yalan olurdu; bilmiyorsak susariz.
        if (covered.isEmpty()) {
            return List.of();
        }
        return snap.session().activityTypes().stream()
                .filter(a -> !covered.contains(a)).toList();
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
                snap.session().activityTypes(), snap.session().sessionType(),
                snap.session().status(), hostDisplayName, participants.size(), participants,
                hostOnline, openPlanDto(snap.session(), snap.participants()));
    }

    /**
     * Kesfet listesi. {@code locality} yalniz SEMTTIR: `midpointLabel` (acik planda kurulusta
     * yazilir, K-B15) ya da host'un kendi etiketi — sokak/numara asla. Kart kesin koordinat da
     * tasimaz; dakika isteyenin kendi yuvarlanmis konumundan gelir (DiscoverQueries).
     */
    public ApiDtos.DiscoverResponse toDiscover(List<DiscoverQueries.Row> rows,
                                               Set<ActivityType> filter, TravelMode mode) {
        List<ApiDtos.PlanCardDto> plans = rows.stream().map(r -> new ApiDtos.PlanCardDto(
                r.session().slug(), r.session().name(), r.session().activityTypes(),
                r.session().openPlan().meetAt(), r.session().openPlan().capacity(),
                r.approvedSeats(), r.confirmed(), r.session().openPlan().joinPolicy(),
                r.hostDisplayName(), r.session().midpointLabel(), r.minutes(), mode)).toList();
        return new ApiDtos.DiscoverResponse(plans, filter.stream().sorted().toList());
    }

    /**
     * Kutular HAZIR gelir; burada bolme YOK. Bolme eskiden burada yapiliyordu, yani tavan
     * kutulardan ONCE uygulaniyordu ve yeni oturumlar eski ama hala acik bir oturumu listeden
     * sessizce dusuruyordu — ayirma artik sorgunun isi (UserProfileQueries.mySessions).
     */
    public ApiDtos.SessionListResponse toList(UserProfileQueries.MySessions rows) {
        return new ApiDtos.SessionListResponse(toSummaryDtos(rows.open()),
                toSummaryDtos(rows.past()), rows.pastTruncated());
    }

    private static List<ApiDtos.SessionSummaryDto> toSummaryDtos(List<SessionSummary> rows) {
        return rows.stream().map(SessionViewAssembler::toSummaryDto).toList();
    }

    private static ApiDtos.SessionSummaryDto toSummaryDto(SessionSummary s) {
        List<ApiDtos.SummaryParticipantDto> people = s.participants().stream()
                .map(p -> new ApiDtos.SummaryParticipantDto(p.displayName(), p.ready(), p.host()))
                .toList();
        return new ApiDtos.SessionSummaryDto(s.session().slug(), s.session().name(),
                s.session().activityTypes(), s.session().sessionType(), s.session().status(),
                s.createdAt(), s.session().expiresAt(), s.participantCount(), s.readyCount(),
                s.doneCount(), people, s.decidedVenueName(), s.decidedVenuePhotoUrl());
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti (tek kaynak: TravelMinutes.approx). */
    static ApiDtos.GeoPointDto approx(GeoPoint p) {
        GeoPoint rounded = TravelMinutes.approx(p);
        return new ApiDtos.GeoPointDto(rounded.lat(), rounded.lng());
    }

    private static ApiDtos.FairnessDto toFairnessDto(Fairness f) {
        return new ApiDtos.FairnessDto(f.maxMinutes(), f.spreadMinutes(), f.longestParticipantId());
    }
}
