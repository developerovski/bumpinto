package com.bumpinto.application.session;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionQueries {

    private static final EnumSet<SessionStatus> VENUES_VISIBLE =
            EnumSet.of(SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);

    private final SessionStorePort store;
    private final DeckStorePort deck;
    private final Clock clock;

    public SessionQueries(SessionStorePort store, DeckStorePort deck, Clock clock) {
        this.store = store;
        this.deck = deck;
        this.clock = clock;
    }

    public record SessionSnapshot(Session session, List<Participant> participants,
                                  List<Venue> venues, Map<UUID, Long> voteTally) {
    }

    /** Okuma tarafı da tembel expiry uygular: süresi dolmuş oturum EXPIRED raporlanır, DB'ye yazılmaz. */
    public SessionSnapshot snapshot(String slug) {
        Session stored = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        Session session = SessionExpiry.applied(stored, clock.instant());
        List<Venue> venues = VENUES_VISIBLE.contains(session.status())
                ? deck.venuesOf(session.id()) : List.of();
        Map<UUID, Long> tally = session.status() == SessionStatus.DECIDED
                ? deck.voteTally(session.id()) : Map.of();
        return new SessionSnapshot(session, store.participantsOf(session.id()), venues, tally);
    }
}
