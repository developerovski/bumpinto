package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.session.SessionType;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

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
        e.activityType = s.activityType().name();
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
        sessions.save(e);
        return s;
    }

    @Override public Optional<Session> sessionBySlug(String slug) {
        return sessions.findBySlug(slug).map(SessionStoreAdapter::toSession);
    }

    @Override public Participant saveParticipant(Participant p) {
        ParticipantEntity e = new ParticipantEntity();
        e.id = p.id();
        e.sessionId = p.sessionId();
        e.displayName = p.displayName();
        e.lat = p.location() == null ? null : p.location().lat();
        e.lng = p.location() == null ? null : p.location().lng();
        e.token = p.token();
        e.deckDoneAt = p.deckDoneAt();
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

    @Override public Optional<Participant> participantByToken(String token) {
        return participants.findByToken(token).map(SessionStoreAdapter::toParticipant);
    }

    @Override public void deleteParticipant(UUID participantId) {
        participants.deleteById(participantId);
    }

    @Override public List<SessionSummary> summariesOfHost(UUID hostId, int limit) {
        List<SessionEntity> rows = sessions.findByHostIdOrderByCreatedAtDescIdDesc(hostId,
                PageRequest.of(0, limit));
        List<UUID> sessionIds = rows.stream().map(e -> e.id).toList();
        Map<UUID, List<ParticipantEntity>> bySession = participants.findBySessionIdIn(sessionIds)
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

    private static SessionSummary toSummary(SessionEntity e, List<ParticipantEntity> ps,
                                            Map<UUID, VenueEntity> venueById) {
        int ready = 0;
        int done = 0;
        for (ParticipantEntity p : ps) {
            if (p.lat != null && p.lng != null) {
                ready++;
            }
            if (p.deckDoneAt != null) {
                done++;
            }
        }
        VenueEntity decided = e.decidedVenueId == null ? null : venueById.get(e.decidedVenueId);
        return new SessionSummary(toSession(e), e.createdAt, ps.size(), ready, done,
                decided == null ? null : decided.name, decided == null ? null : decided.photoUrl);
    }

    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        return new Session(e.id, e.slug, e.hostId, e.name, ActivityType.valueOf(e.activityType),
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff, e.decidedAt,
                e.decisionKind == null ? null : DecisionKind.valueOf(e.decisionKind),
                e.runoffReason == null ? null : RunoffReason.valueOf(e.runoffReason),
                e.midpointLabel);
    }

    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost, e.token,
                e.deckDoneAt, e.isManual, e.locationLabel,
                e.travelMode == null ? null : TravelMode.valueOf(e.travelMode));
    }
}
