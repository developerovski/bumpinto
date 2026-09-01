package com.bumpinto.support;

import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.venue.Venue;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class FakeStores {

    public static class InMemorySessionStore implements SessionStorePort {
        public final Map<UUID, Session> sessions = new HashMap<>();
        public final Map<UUID, Participant> participants = new HashMap<>();

        @Override public Session saveSession(Session s) {
            sessions.put(s.id(), s);
            return s;
        }

        @Override public Optional<Session> sessionBySlug(String slug) {
            return sessions.values().stream().filter(s -> s.slug().equals(slug)).findFirst();
        }

        @Override public Participant saveParticipant(Participant p) {
            participants.put(p.id(), p);
            return p;
        }

        @Override public List<Participant> participantsOf(UUID sessionId) {
            return participants.values().stream()
                    .filter(p -> p.sessionId().equals(sessionId)).toList();
        }

        @Override public Optional<Participant> participantByToken(String token) {
            return participants.values().stream().filter(p -> p.token().equals(token)).findFirst();
        }
    }

    public record Published(String slug, SessionEvent event) {
    }

    public static class RecordingEvents implements SessionEventsPort {
        public final List<Published> published = new ArrayList<>();

        @Override public void publish(String slug, SessionEvent event) {
            published.add(new Published(slug, event));
        }
    }

    /** Satır anahtarları gerçek şemayı yansıtır: swipe (venue, participant), vote (session, participant). */
    public static class InMemoryDeckStore implements DeckStorePort {
        public record SwipeKey(UUID venueId, UUID participantId) {
        }

        public record Swipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked) {
        }

        public record VoteKey(UUID sessionId, UUID participantId) {
        }

        public record Vote(UUID sessionId, UUID venueId, UUID participantId) {
        }

        public final List<Venue> venues = new ArrayList<>();
        public final Map<SwipeKey, Swipe> swipes = new LinkedHashMap<>();
        public final Map<VoteKey, Vote> votes = new LinkedHashMap<>();

        @Override public List<Venue> saveVenues(List<Venue> vs) {
            venues.addAll(vs);
            return vs;
        }

        @Override public List<Venue> venuesOf(UUID sessionId) {
            return venues.stream().filter(v -> v.sessionId().equals(sessionId))
                    .sorted(Comparator.comparingInt(Venue::deckOrder)).toList();
        }

        @Override public void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked) {
            swipes.put(new SwipeKey(venueId, participantId),
                    new Swipe(sessionId, venueId, participantId, liked));
        }

        @Override public void deleteSwipe(UUID venueId, UUID participantId) {
            swipes.remove(new SwipeKey(venueId, participantId));
        }

        /** Swipe atmış her katılımcı haritada yer alır; hiç beğenisi yoksa değeri boş settir. */
        @Override public Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId) {
            return swipes.values().stream().filter(s -> s.sessionId().equals(sessionId))
                    .collect(Collectors.groupingBy(Swipe::participantId,
                            Collectors.flatMapping(
                                    s -> s.liked() ? Stream.of(s.venueId()) : Stream.<UUID>empty(),
                                    Collectors.toCollection(HashSet::new))));
        }

        @Override public void castVote(UUID sessionId, UUID venueId, UUID participantId) {
            votes.put(new VoteKey(sessionId, participantId),
                    new Vote(sessionId, venueId, participantId));
        }

        @Override public Map<UUID, Long> voteTally(UUID sessionId) {
            return votes.values().stream().filter(v -> v.sessionId().equals(sessionId))
                    .collect(Collectors.groupingBy(Vote::venueId, Collectors.counting()));
        }

        @Override public long votersCount(UUID sessionId) {
            return votes.values().stream().filter(v -> v.sessionId().equals(sessionId)).count();
        }
    }
}
