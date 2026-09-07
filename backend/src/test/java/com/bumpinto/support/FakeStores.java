package com.bumpinto.support;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.ReportStorePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.safety.Report;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.user.AuthProvider;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;
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

        @Override public List<UUID> sessionIdsOfHost(UUID hostId) {
            return sessions.values().stream().filter(s -> s.hostId().equals(hostId))
                    .map(Session::id).toList();
        }

        @Override public void deleteSession(UUID sessionId) {
            sessions.remove(sessionId);
            participants.values().removeIf(p -> p.sessionId().equals(sessionId));
            createdAt.remove(sessionId);
        }

        @Override public List<Participant> participantsOfUser(UUID userId) {
            return participants.values().stream()
                    .filter(p -> userId.equals(p.userId())).toList();
        }

        @Override public void anonymizeParticipant(UUID participantId, String displayName,
                                                   Instant when) {
            Participant p = participants.get(participantId);
            if (p != null) {
                participants.put(participantId, new Participant(p.id(), p.sessionId(), displayName,
                        null, p.host(), p.deckDoneAt(), p.manual(), null, p.travelMode(), null));
            }
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
        public final Map<UUID, String> appleSubs = new HashMap<>();
        public final Map<UUID, String> refreshTokens = new HashMap<>();
        public final Map<UUID, Instant> deletedAt = new HashMap<>();
        public final Map<UUID, Instant> purgeAfter = new HashMap<>();

        @Override public UUID upsertByEmail(String email, String name) {
            return byEmail(email).map(UserProfile::id)
                    .orElseGet(() -> {
                        UUID id = UUID.randomUUID();
                        users.put(id, new UserProfile(id, email, name, null, null, null, null));
                        return id;
                    });
        }

        /** Adapter ile ayni sira: (1) apple_sub, (2) e-posta, (3) yeni hesap. */
        @Override public UUID upsertByAppleSub(String appleSub, String email, String name) {
            Optional<UUID> bySub = appleSubs.entrySet().stream()
                    .filter(e -> e.getValue().equals(appleSub)).map(Map.Entry::getKey).findFirst();
            if (bySub.isPresent()) {
                return link(bySub.get(), appleSub);
            }
            Optional<UserProfile> byEmail = email == null ? Optional.empty() : byEmail(email);
            if (byEmail.isPresent()) {
                return link(byEmail.get().id(), appleSub);
            }
            UUID id = UUID.randomUUID();
            users.put(id, new UserProfile(id, email, name, null, null, null, null, null,
                    Set.of(AuthProvider.APPLE), null));
            appleSubs.put(id, appleSub);
            return id;
        }

        private UUID link(UUID id, String appleSub) {
            appleSubs.put(id, appleSub);
            UserProfile p = users.get(id);
            Set<AuthProvider> providers = EnumSet.copyOf(p.authProviders());
            providers.add(AuthProvider.APPLE);
            users.put(id, new UserProfile(p.id(), p.email(), p.name(), p.defaultLocation(),
                    p.defaultLocationLabel(), p.defaultActivity(), p.language(),
                    p.defaultTravelMode(), providers, p.consents()));
            return id;
        }

        private Optional<UserProfile> byEmail(String email) {
            return users.values().stream()
                    .filter(u -> deletedAt.get(u.id()) == null)
                    .filter(u -> email.equals(u.email())).findFirst();
        }

        @Override public void saveAppleRefreshToken(UUID userId, String refreshToken) {
            refreshTokens.put(userId, refreshToken);
        }

        @Override public Optional<String> appleRefreshToken(UUID userId) {
            return Optional.ofNullable(refreshTokens.get(userId));
        }

        @Override public void softDelete(UUID userId, Instant when, Instant purgeAt) {
            deletedAt.put(userId, when);
            purgeAfter.put(userId, purgeAt);
            appleSubs.remove(userId);
            refreshTokens.remove(userId);
            UserProfile p = users.get(userId);
            if (p != null) {
                // Kimlik serbest birakilir: ayni e-posta yeniden kayit olabilmeli.
                users.put(userId, new UserProfile(userId, "deleted+" + userId + "@invalid",
                        "Silindi", null, null, null, null, null, p.authProviders(), p.consents()));
            }
        }

        @Override public Optional<UserProfile> profileOf(UUID userId) {
            return deletedAt.containsKey(userId) ? Optional.empty()
                    : Optional.ofNullable(users.get(userId));
        }

        @Override public UserProfile saveProfile(UserProfile profile) {
            users.put(profile.id(), profile);
            return profile;
        }
    }

    public static class InMemoryReportStore implements ReportStorePort {
        public final List<Report> saved = new ArrayList<>();

        @Override public Report save(Report report) {
            saved.add(report);
            return report;
        }
    }

    public static class InMemoryBlockStore implements BlockStorePort {
        public final Map<UUID, Block> blocks = new LinkedHashMap<>();

        @Override public Block save(Block block) {
            blocks.put(block.id(), block);
            return block;
        }

        @Override public List<Block> blocksOf(UUID blockerUserId) {
            return blocks.values().stream()
                    .filter(b -> b.blockerUserId().equals(blockerUserId)).toList();
        }

        @Override public boolean delete(UUID blockerUserId, UUID blockId) {
            Block found = blocks.get(blockId);
            if (found == null || !found.blockerUserId().equals(blockerUserId)) {
                return false;
            }
            blocks.remove(blockId);
            return true;
        }

        @Override public Set<UUID> blockedUserIdsOf(UUID blockerUserId) {
            return blocks.values().stream()
                    .filter(b -> b.blockerUserId().equals(blockerUserId))
                    .map(Block::blockedUserId).filter(Objects::nonNull)
                    .collect(Collectors.toSet());
        }

        @Override public Set<UUID> blockerUserIdsOf(UUID blockedUserId) {
            return blocks.values().stream()
                    .filter(b -> blockedUserId.equals(b.blockedUserId()))
                    .map(Block::blockerUserId).collect(Collectors.toSet());
        }

        @Override public Set<UUID> blockedParticipantIdsOf(UUID blockerUserId, UUID sessionId) {
            return blocks.values().stream()
                    .filter(b -> b.blockerUserId().equals(blockerUserId))
                    .filter(b -> sessionId.equals(b.sessionId()))
                    .map(Block::blockedParticipantId).filter(Objects::nonNull)
                    .collect(Collectors.toSet());
        }
    }

    public static class FakePresence implements PresencePort {
        public final Map<UUID, Set<UUID>> present = new HashMap<>();

        @Override public void arrived(UUID sessionId, UUID participantId, String wsSessionId) {
            present.computeIfAbsent(sessionId, key -> new HashSet<>()).add(participantId);
        }

        @Override public void left(UUID sessionId, UUID participantId, String wsSessionId) {
            Set<UUID> seats = present.get(sessionId);
            if (seats != null) {
                seats.remove(participantId);
            }
        }

        @Override public java.time.Duration graceWindow() {
            return java.time.Duration.ZERO;
        }

        @Override public Set<UUID> presentIn(UUID sessionId) {
            return Set.copyOf(present.getOrDefault(sessionId, Set.of()));
        }
    }

    /** Zamanlayicisiz oda: sure dolumu {@link #expire} ile elle tetiklenir. */
    public static class FakeVoiceRooms implements VoiceRoomsPort {
        public final Map<UUID, VoiceRoom> rooms = new HashMap<>();
        public final Map<UUID, Runnable> expiries = new HashMap<>();

        @Override public VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire) {
            return rooms.computeIfAbsent(sessionId, key -> {
                expiries.put(sessionId, onExpire);
                return new VoiceRoom(sessionId, slug, Instant.EPOCH, endsAt, Map.of());
            });
        }

        @Override public Optional<VoiceRoom> close(UUID sessionId) {
            expiries.remove(sessionId);
            return Optional.ofNullable(rooms.remove(sessionId));
        }

        @Override public Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat) {
            return update(sessionId, members -> {
                members.put(participantId, seat);
                return true;
            });
        }

        @Override public Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId) {
            return update(sessionId, members -> members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId)
                            && e.getValue().subscriptionId().equals(subscriptionId)));
        }

        @Override public Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId) {
            return update(sessionId, members -> members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId)));
        }

        @Override public Optional<VoiceRoom> roomOf(UUID sessionId) {
            return Optional.ofNullable(rooms.get(sessionId));
        }

        public void expire(UUID sessionId) {
            Runnable onExpire = expiries.get(sessionId);
            if (onExpire != null) {
                onExpire.run();
            }
        }

        private Optional<VoiceRoom> update(UUID sessionId, Predicate<Map<UUID, Seat>> mutate) {
            VoiceRoom room = rooms.get(sessionId);
            if (room == null) {
                return Optional.empty();
            }
            Map<UUID, Seat> members = new HashMap<>(room.members());
            if (!mutate.test(members)) {
                return Optional.empty();
            }
            VoiceRoom next = new VoiceRoom(room.sessionId(), room.slug(), room.startedAt(),
                    room.endsAt(), members);
            rooms.put(sessionId, next);
            return Optional.of(next);
        }
    }
}
