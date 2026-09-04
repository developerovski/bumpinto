package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Ids;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;

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
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel,
                                             TravelMode hostTravelMode) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), type, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                Ids.participantToken(), null, false, Texts.label(hostLocationLabel),
                hostTravelMode));
        return new CreateSessionResult(session, host);
    }

    @Transactional
    public Participant join(String slug, String displayName, GeoPoint location,
                            String locationLabel, TravelMode travelMode) {
        Session session = required(slug);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no invite link");
        }
        if (session.status() == SessionStatus.DECIDED) {
            throw new ConflictException("session is closed: " + session.status());
        }
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, Ids.participantToken(), null,
                false, Texts.label(locationLabel), travelMode));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location, String label,
                               TravelMode travelMode) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        String resolvedLabel = label == null ? participant.locationLabel() : Texts.label(label);
        store.saveParticipant(participant.locatedAt(location, resolvedLabel, travelMode));
        events.publish(slug, SessionEvent.locationUpdated());
    }

    /**
     * SOLO: host elle konum ekler. Token'siz, oy vermeyen katilimci; yalniz COLLECTING'de.
     * travelMode verilmezse (null) varsayilan CAR — Participant'in compact ctor'u zaten coerce
     * eder, burada tekrar etmiyoruz (spec §5.A.7).
     */
    @Transactional
    public Participant addPoint(String slug, UUID hostUserId, String displayName,
                                String locationLabel, GeoPoint location, TravelMode travelMode) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (!session.isSolo()) {
            throw new ConflictException("manual points are only for solo sessions");
        }
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, null, null, true,
                Texts.label(locationLabel), travelMode));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return point;
    }

    @Transactional
    public void removePoint(String slug, UUID hostUserId, UUID participantId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("point not in session"));
        if (!point.manual()) {
            throw new ConflictException("only manual points can be removed");
        }
        store.deleteParticipant(participantId);
        events.publish(slug, SessionEvent.participantLeft(store.participantsOf(session.id()).size()));
    }

    private void requireHost(Session session, UUID userId) {
        if (!session.hostId().equals(userId)) {
            throw new ForbiddenException("only the host can do this");
        }
    }

    Session required(String slug) {
        return SessionExpiry.required(store, slug, clock.instant());
    }
}
