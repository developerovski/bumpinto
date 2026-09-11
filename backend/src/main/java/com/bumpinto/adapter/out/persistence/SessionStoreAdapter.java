package com.bumpinto.adapter.out.persistence;

import com.bumpinto.application.text.Ids;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.session.SessionType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionStoreAdapter implements SessionStorePort {

    private final SessionRepository sessions;
    private final ParticipantRepository participants;
    private final VenueRepository venues;

    public SessionStoreAdapter(SessionRepository sessions, ParticipantRepository participants,
                               VenueRepository venues) {
        this.sessions = sessions;
        this.participants = participants;
        this.venues = venues;
    }

    @Override public Session saveSession(Session s) {
        SessionEntity e = new SessionEntity();
        e.id = s.id();
        e.slug = s.slug();
        e.hostId = s.hostId();
        e.name = s.name();
        e.activityTypes = s.activityTypes().stream()
                .map(ActivityType::name).collect(Collectors.joining(","));
        e.sessionType = s.sessionType().name();
        e.status = s.status().name();
        e.expiresAt = s.expiresAt();
        e.decidedVenueId = s.decidedVenueId();
        e.runoffVenueIds = s.runoffVenueIds().isEmpty() ? null
                : s.runoffVenueIds().stream().map(UUID::toString).collect(Collectors.joining(","));
        e.decidedAt = s.decidedAt();
        e.decisionKind = s.decisionKind() == null ? null : s.decisionKind().name();
        e.runoffReason = s.runoffReason() == null ? null : s.runoffReason().name();
        e.midpointLabel = s.midpointLabel();
        e.anchorLat = s.anchor() == null ? null : s.anchor().lat();
        e.anchorLng = s.anchor() == null ? null : s.anchor().lng();
        e.joinCode = s.joinCode();
        e.meetAt = s.openPlan() == null ? null : s.openPlan().meetAt();
        e.capacity = s.openPlan() == null ? null : (short) s.openPlan().capacity();
        e.joinPolicy = s.openPlan() == null ? null : s.openPlan().joinPolicy().name();
        sessions.save(e);
        return s;
    }

    @Override public Optional<Session> sessionBySlug(String slug) {
        return sessions.findBySlug(slug).map(SessionStoreAdapter::toSession);
    }

    @Override public List<Session> findPublicUpcoming(Instant now, Instant until) {
        return sessions.findPublicUpcoming(now, until).stream()
                .map(SessionStoreAdapter::toSession).toList();
    }

    @Override public Participant saveParticipant(Participant p) {
        ParticipantEntity e = new ParticipantEntity();
        e.id = p.id();
        e.sessionId = p.sessionId();
        e.displayName = p.displayName();
        e.lat = p.location() == null ? null : p.location().lat();
        e.lng = p.location() == null ? null : p.location().lng();
        e.deckDoneAt = p.deckDoneAt();
        e.userId = p.userId();
        e.isHost = p.host();
        e.isManual = p.manual();
        e.locationLabel = p.locationLabel();
        e.travelMode = p.travelMode().name();
        participants.save(e);
        return p;
    }

    @Override public List<Participant> participantsOf(UUID sessionId) {
        return participants.findBySessionIdOrderByJoinedAtAscIdAsc(sessionId).stream()
                .map(SessionStoreAdapter::toParticipant).toList();
    }

    @Override public Optional<Participant> participantOf(UUID sessionId, UUID userId) {
        return participants.findBySessionIdAndUserId(sessionId, userId)
                .map(SessionStoreAdapter::toParticipant);
    }


    @Override public void deleteParticipant(UUID participantId) {
        participants.deleteById(participantId);
    }

    @Override public List<SessionSummary> openSummariesOfHost(UUID hostId, Instant now) {
        return summariesOf(sessions.findOpenByHost(hostId, now));
    }

    @Override public List<SessionSummary> pastSummariesOfHost(UUID hostId, Instant now, int limit) {
        return summariesOf(sessions.findPastByHost(hostId, now, PageRequest.of(0, limit)));
    }

    /** Satirlar ne olursa olsun TOPLU yuklenir: katilimcilar tek sorgu, mekanlar tek sorgu. */
    private List<SessionSummary> summariesOf(List<SessionEntity> rows) {
        List<UUID> sessionIds = rows.stream().map(e -> e.id).toList();
        Map<UUID, List<ParticipantEntity>> bySession = participants
                .findBySessionIdInOrderByJoinedAtAscIdAsc(sessionIds)
                .stream().collect(Collectors.groupingBy(p -> p.sessionId));
        Set<UUID> decidedVenueIds = rows.stream().map(e -> e.decidedVenueId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, VenueEntity> venueById = venues.findAllById(decidedVenueIds).stream()
                .collect(Collectors.toMap(v -> v.id, v -> v));
        return rows.stream()
                .map(e -> toSummary(e, bySession.getOrDefault(e.id, List.of()), venueById))
                .toList();
    }

    @Override public long hostedSessionCount(UUID hostId) {
        return sessions.countByHostId(hostId);
    }

    @Override public long distinctGuestsOfHost(UUID hostId) {
        return participants.countDistinctGuestsOfHost(hostId);
    }

    @Override public List<UUID> sessionIdsOfHost(UUID hostId) {
        return sessions.findByHostIdOrderByCreatedAtDescIdDesc(hostId, Pageable.unpaged()).stream()
                .map(e -> e.id).toList();
    }

    /** Alt tablolar sema cascade'i ile gider (SessionCascadeDeleteTest). */
    @Override public void deleteSession(UUID sessionId) {
        sessions.deleteById(sessionId);
    }

    @Override public List<Participant> participantsOfUser(UUID userId) {
        return participants.findByUserId(userId).stream()
                .map(SessionStoreAdapter::toParticipant).toList();
    }

    /**
     * Koltuk KALIR, kimlik gider: satir silinseydi o oturumun orta noktasi, deste geometrisi ve
     * oy populasyonu geriye donuk degisir, katilan herkesin ekranindaki sayilar bozulurdu.
     */
    @Override public void anonymizeParticipant(UUID participantId, String displayName, Instant when) {
        participants.findById(participantId).ifPresent(p -> {
            p.displayName = displayName;
            p.userId = null;
            p.lat = null;
            p.lng = null;
            p.locationLabel = null;
            p.anonymizedAt = when;
            participants.save(p);
        });
    }

    /** Denemeler tukenirse ISTISNA atilir: kodsuz oturum acmak "kod ozelligi yok" demektir. */
    @Override public String freshJoinCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = Ids.joinCode();
            if (!sessions.existsByJoinCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("could not allocate a unique join code");
    }

    @Override public Optional<Session> sessionByJoinCode(String joinCode) {
        return sessions.findByJoinCode(joinCode).map(SessionStoreAdapter::toSession);
    }

    private static SessionSummary toSummary(SessionEntity e, List<ParticipantEntity> ps,
                                            Map<UUID, VenueEntity> venueById) {
        int ready = 0;
        int done = 0;
        // Avatar yigini AYNI dongude kurulur: satirlar zaten elimizde, ikinci sorgu yok.
        List<SessionSummary.ParticipantSummary> people = new ArrayList<>(ps.size());
        for (ParticipantEntity p : ps) {
            boolean located = p.lat != null && p.lng != null;
            if (located) {
                ready++;
            }
            if (p.deckDoneAt != null) {
                done++;
            }
            people.add(new SessionSummary.ParticipantSummary(p.displayName, located, p.isHost));
        }
        VenueEntity decided = e.decidedVenueId == null ? null : venueById.get(e.decidedVenueId);
        return new SessionSummary(toSession(e), e.createdAt, ps.size(), ready, done, people,
                decided == null ? null : decided.name, decided == null ? null : decided.photoUrl);
    }

    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        // runoffVenueIds'in aksine null denetimi YOK: kolon V1'den beri NOT NULL ve yazma
        // yolu @NotEmpty ile korunuyor — bos dize buraya ulasamaz.
        List<ActivityType> activities = Arrays.stream(e.activityTypes.split(","))
                .map(ActivityType::valueOf).toList();
        GeoPoint anchor = e.anchorLat == null ? null : new GeoPoint(e.anchorLat, e.anchorLng);
        return new Session(e.id, e.slug, e.hostId, e.name, activities,
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff, e.decidedAt,
                e.decisionKind == null ? null : DecisionKind.valueOf(e.decisionKind),
                e.runoffReason == null ? null : RunoffReason.valueOf(e.runoffReason),
                e.midpointLabel, anchor, e.joinCode, openPlanOf(e));
    }

    /** Uc kolon birlikte gider birlikte gelir; sekil kisiti semada, burada tek bir null kapisi. */
    private static OpenPlan openPlanOf(SessionEntity e) {
        return e.meetAt == null ? null
                : new OpenPlan(e.meetAt, e.capacity, JoinPolicy.valueOf(e.joinPolicy));
    }

    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost,
                e.deckDoneAt, e.isManual, e.locationLabel,
                e.travelMode == null ? null : TravelMode.valueOf(e.travelMode), e.userId);
    }
}
