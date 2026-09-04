package com.bumpinto.support;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.domain.venue.Venue;

import java.time.Instant;
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
        public final Map<UUID, Instant> createdAt = new HashMap<>();

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


        @Override public Optional<Participant> participantOf(UUID sessionId, UUID userId) {
            return participantsOf(sessionId).stream()
                    .filter(p -> userId.equals(p.userId())).findFirst();
        }

        @Override public void deleteParticipant(UUID participantId) {
            participants.remove(participantId);
        }

        @Override public List<SessionSummary> summariesOfHost(UUID hostId, int limit) {
            return sessions.values().stream()
                    .filter(s -> s.hostId().equals(hostId))
                    // Adaptor'la ayni tie-break: findByHostIdOrderByCreatedAtDescIdDesc
                    .sorted(Comparator.comparing(this::createdAtOf, Comparator.reverseOrder())
                            .thenComparing(Session::id, Comparator.reverseOrder()))
                    .limit(limit)
                    .map(this::toSummary)
                    .toList();
        }

        @Override public long hostedSessionCount(UUID hostId) {
            return sessions.values().stream().filter(s -> s.hostId().equals(hostId)).count();
        }

        @Override public long distinctGuestsOfHost(UUID hostId) {
            Set<UUID> hostSessionIds = sessions.values().stream()
                    .filter(s -> s.hostId().equals(hostId)).map(Session::id)
                    .collect(Collectors.toSet());
            return participants.values().stream()
                    .filter(p -> hostSessionIds.contains(p.sessionId()))
                    .filter(p -> !p.host() && !p.manual())
                    .map(Participant::displayName)
                    .distinct()
                    .count();
        }

        private Instant createdAtOf(Session s) {
            return createdAt.getOrDefault(s.id(), Instant.EPOCH);
        }

        private SessionSummary toSummary(Session s) {
            List<Participant> ps = participantsOf(s.id());
            int ready = (int) ps.stream().filter(Participant::hasLocation).count();
            int done = (int) ps.stream().filter(Participant::deckDone).count();
            return new SessionSummary(s, createdAtOf(s), ps.size(), ready, done, null, null);
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

        @Override public void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds) {
            for (int i = 0; i < orderedVenueIds.size(); i++) {
                UUID id = orderedVenueIds.get(i);
                int order = i;
                venues.replaceAll(v -> v.id().equals(id) ? v.withDeckOrder(order) : v);
            }
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


        @Override public Map<UUID, UUID> votesByParticipant(UUID sessionId) {
            return votes.values().stream().filter(v -> v.sessionId().equals(sessionId))
                    .collect(Collectors.toMap(Vote::participantId, Vote::venueId));
        }
    }

    /** Sabit etiket; testler `label` alanini degistirerek "cozulemedi" halini kurar. */
    public static class FakeReverseGeocoder implements ReverseGeocodePort {
        public String label = "Eindhoven";
        public int calls;

        @Override public Optional<String> label(GeoPoint point) {
            calls++;
            return Optional.ofNullable(label);
        }
    }

    public static class InMemoryUserStore implements UserStorePort {
        public final Map<UUID, UserProfile> users = new HashMap<>();

        @Override public UUID upsertByEmail(String email, String name) {
            return users.values().stream().filter(u -> u.email().equals(email)).findFirst()
                    .map(UserProfile::id)
                    .orElseGet(() -> {
                        UUID id = UUID.randomUUID();
                        users.put(id, new UserProfile(id, email, name, null, null, null, null));
                        return id;
                    });
        }

        @Override public Optional<UserProfile> profileOf(UUID userId) {
            return Optional.ofNullable(users.get(userId));
        }

        @Override public UserProfile saveProfile(UserProfile profile) {
            users.put(profile.id(), profile);
            return profile;
        }
    }
}
