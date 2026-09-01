package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionStoreAdapter implements SessionStorePort {

    private final SessionRepository sessions;
    private final ParticipantRepository participants;

    public SessionStoreAdapter(SessionRepository sessions, ParticipantRepository participants) {
        this.sessions = sessions;
        this.participants = participants;
    }

    @Override public Session saveSession(Session s) {
        SessionEntity e = new SessionEntity();
        e.id = s.id();
        e.slug = s.slug();
        e.hostId = s.hostId();
        e.name = s.name();
        e.activityType = s.activityType().name();
        e.status = s.status().name();
        e.expiresAt = s.expiresAt();
        e.decidedVenueId = s.decidedVenueId();
        e.runoffVenueIds = s.runoffVenueIds().isEmpty() ? null
                : s.runoffVenueIds().stream().map(UUID::toString).collect(Collectors.joining(","));
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
        participants.save(e);
        return p;
    }

    @Override public List<Participant> participantsOf(UUID sessionId) {
        return participants.findBySessionId(sessionId).stream()
                .map(SessionStoreAdapter::toParticipant).toList();
    }

    @Override public Optional<Participant> participantByToken(String token) {
        return participants.findByToken(token).map(SessionStoreAdapter::toParticipant);
    }

    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        return new Session(e.id, e.slug, e.hostId, e.name, ActivityType.valueOf(e.activityType),
                SessionStatus.valueOf(e.status), e.expiresAt, e.decidedVenueId, runoff);
    }

    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost, e.token, e.deckDoneAt);
    }
}
