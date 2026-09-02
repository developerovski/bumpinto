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
import java.util.Optional;
import java.util.UUID;

@Service
public class SessionQueries {

    private static final EnumSet<SessionStatus> VENUES_VISIBLE = EnumSet.of(
            SessionStatus.BROWSING, SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);

    private final SessionStorePort store;
    private final DeckStorePort deck;
    private final Clock clock;

    public SessionQueries(SessionStorePort store, DeckStorePort deck, Clock clock) {
        this.store = store;
        this.deck = deck;
        this.clock = clock;
    }

    /** {@code runoffVotes}: katilimci -> sectigi mekan; yalniz RUNOFF'ta dolu. */
    public record SessionSnapshot(Session session, List<Participant> participants,
                                  List<Venue> venues, Map<UUID, Long> voteTally,
                                  Map<UUID, UUID> runoffVotes) {
    }

    /**
     * Oturumu kuran hesabın katılımcı kimliği; başkası sorarsa boş.
     *
     * <p>Host da bir katılımcıdır, ama katılımcı token'ı yalnızca oturum kurulurken BİR KEZ
     * çereze yazılır (Path=/api/sessions/{slug}, 24s). Host oturumu başka bir tarayıcıda ya da
     * cihazda — örneğin "Oturumlar" listesinden — açtığında elinde sadece hesap JWT'si olur ve
     * o çerez bir daha ASLA dağıtılmaz. Kimlik buradan çözülmezse okuma tarafı (SessionView
     * .viewer) çalışmaya devam eder, yazma tarafı 403 döner: host kaydırır, hiçbir swipe
     * sunucuya ulaşmaz ve ekran her şey yolundaymış gibi görünür.
     *
     * <p>Yetki genişlemesi değil: JWT zaten aynı oturumda find-venues/shuffle/force-decision'ı
     * açıyor — kendi swipe'ını kaydetmek bunlardan daha dar bir yetki.
     */
    public Optional<UUID> hostParticipantId(String slug, UUID userId) {
        return store.sessionBySlug(slug)
                .filter(session -> session.hostId().equals(userId))
                .flatMap(session -> store.participantsOf(session.id()).stream()
                        .filter(Participant::host).map(Participant::id).findFirst());
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
        Map<UUID, UUID> runoffVotes = session.status() == SessionStatus.RUNOFF
                ? deck.votesByParticipant(session.id()) : Map.of();
        return new SessionSnapshot(session, store.participantsOf(session.id()), venues, tally,
                runoffVotes);
    }
}
