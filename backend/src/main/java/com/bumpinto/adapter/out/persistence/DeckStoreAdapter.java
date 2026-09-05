package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.Venue;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class DeckStoreAdapter implements DeckStorePort {

    private final VenueRepository venues;
    private final SwipeRepository swipes;
    private final VoteRepository votes;

    public DeckStoreAdapter(VenueRepository venues, SwipeRepository swipes, VoteRepository votes) {
        this.venues = venues;
        this.swipes = swipes;
        this.votes = votes;
    }

    @Override public List<Venue> saveVenues(List<Venue> list) {
        venues.saveAll(list.stream().map(v -> {
            VenueEntity e = new VenueEntity();
            e.id = v.id();
            e.sessionId = v.sessionId();
            e.provider = v.provider();
            e.externalId = v.externalId();
            e.name = v.name();
            e.lat = v.location().lat();
            e.lng = v.location().lng();
            e.rating = v.rating();
            e.priceLevel = v.priceLevel();
            e.photoUrl = v.photoUrl();
            e.mapsUrl = v.mapsUrl();
            e.deckOrder = v.deckOrder();
            e.category = v.category();
            e.address = v.address();
            e.locality = v.locality();
            e.ratingCount = v.ratingCount();
            e.hoursToday = v.hoursToday();
            e.placeLink = v.placeLink();
            e.activityType = v.activityType() == null ? null : v.activityType().name();
            return e;
        }).toList());
        return list;
    }

    @Override public List<Venue> venuesOf(UUID sessionId) {
        return venues.findBySessionIdOrderByDeckOrder(sessionId).stream()
                .map(e -> new Venue(e.id, e.sessionId, e.provider, e.externalId, e.name,
                        new GeoPoint(e.lat, e.lng), e.rating, e.priceLevel, e.photoUrl,
                        e.mapsUrl, e.deckOrder, e.category, e.address, e.locality, e.ratingCount,
                        e.hoursToday, e.placeLink,
                        e.activityType == null ? null : ActivityType.valueOf(e.activityType)))
                .toList();
    }

    @Override public void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds) {
        List<VenueEntity> rows = venues.findBySessionIdOrderByDeckOrder(sessionId);
        rows.forEach(e -> e.deckOrder += 1000);
        venues.saveAllAndFlush(rows);
        Map<UUID, Integer> target = new HashMap<>();
        for (int i = 0; i < orderedVenueIds.size(); i++) {
            target.put(orderedVenueIds.get(i), i);
        }
        rows.forEach(e -> e.deckOrder = target.get(e.id));
        venues.saveAllAndFlush(rows);
    }

    @Override public void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked) {
        SwipeEntity e = new SwipeEntity();
        e.sessionId = sessionId;
        e.venueId = venueId;
        e.participantId = participantId;
        e.liked = liked;
        swipes.save(e);
    }

    @Override public void deleteSwipe(UUID venueId, UUID participantId) {
        swipes.deleteById(new SwipeEntity.Key(venueId, participantId));
    }

    /**
     * Swipe atmış her katılımcı haritada yer alır; hiç beğenisi yoksa değeri boş settir.
     * "Hiç swipe atmadı" ile "hiçbirini beğenmedi" ayrımını karar motoru için korur.
     */
    @Override public Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId) {
        return swipes.findBySessionId(sessionId).stream().collect(Collectors.groupingBy(
                e -> e.participantId,
                Collectors.flatMapping(
                        e -> e.liked ? Stream.of(e.venueId) : Stream.empty(),
                        Collectors.toCollection(HashSet::new))));
    }

    @Override public void castVote(UUID sessionId, UUID venueId, UUID participantId) {
        VoteEntity e = new VoteEntity();
        e.sessionId = sessionId;
        e.participantId = participantId;
        e.venueId = venueId;
        votes.save(e);
    }

    @Override public Map<UUID, Long> voteTally(UUID sessionId) {
        return votes.findBySessionId(sessionId).stream()
                .collect(Collectors.groupingBy(e -> e.venueId, Collectors.counting()));
    }

    @Override public Map<UUID, UUID> votesByParticipant(UUID sessionId) {
        return votes.findBySessionId(sessionId).stream()
                .collect(Collectors.toMap(e -> e.participantId, e -> e.venueId));
    }
}
