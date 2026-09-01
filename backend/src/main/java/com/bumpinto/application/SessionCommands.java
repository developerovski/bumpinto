package com.bumpinto.application;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionCommands {

    static final Duration SESSION_TTL = Duration.ofHours(24);

    private final SessionStorePort store;
    private final SessionEventsPort events;
    private final Clock clock;

    public SessionCommands(SessionStorePort store, SessionEventsPort events, Clock clock) {
        this.store = store;
        this.events = events;
        this.clock = clock;
    }

    public record CreateSessionResult(Session session, Participant hostParticipant) {
    }

    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name, ActivityType type,
                                             GeoPoint hostLocation, String hostDisplayName) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), type, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                Ids.participantToken(), null));
        return new CreateSessionResult(session, host);
    }

    @Transactional
    public Participant join(String slug, String displayName, GeoPoint location) {
        Session session = required(slug);
        if (session.status() == SessionStatus.DECIDED) {
            throw new ConflictException("session is closed: " + session.status());
        }
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, Ids.participantToken(), null));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        store.saveParticipant(participant.locatedAt(location));
    }

    Session required(String slug) {
        return SessionExpiry.required(store, slug, clock.instant());
    }
}
