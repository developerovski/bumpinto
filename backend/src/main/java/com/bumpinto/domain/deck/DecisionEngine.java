package com.bumpinto.domain.deck;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public final class DecisionEngine {

    public static final int FALLBACK_RUNOFF_SIZE = 3;

    public DeckOutcome decide(List<ParticipantLikes> participants, Map<UUID, Double> venueRatings) {
        List<ParticipantLikes> finishers = participants.stream()
                .filter(ParticipantLikes::deckDone)
                .toList();
        if (finishers.isEmpty()) {
            throw new IllegalArgumentException("at least one participant must have finished the deck");
        }

        Map<UUID, Long> likeCounts = finishers.stream()
                .flatMap(p -> p.likedVenueIds().stream())
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        Set<UUID> intersection = new HashSet<>(finishers.get(0).likedVenueIds());
        for (ParticipantLikes p : finishers) {
            intersection.retainAll(p.likedVenueIds());
        }

        Comparator<UUID> byLikesThenRating = Comparator
                .comparingLong((UUID v) -> likeCounts.getOrDefault(v, 0L)).reversed()
                .thenComparing(Comparator.comparingDouble(
                        (UUID v) -> venueRatings.getOrDefault(v, 0.0)).reversed())
                .thenComparing(UUID::compareTo);

        if (intersection.size() == 1) {
            return new DeckOutcome.Decided(intersection.iterator().next());
        }
        if (intersection.size() >= 2) {
            return new DeckOutcome.Runoff(intersection.stream().sorted(byLikesThenRating).toList());
        }

        List<UUID> top = likeCounts.keySet().stream()
                .sorted(byLikesThenRating)
                .limit(FALLBACK_RUNOFF_SIZE)
                .toList();
        if (top.isEmpty()) {
            return new DeckOutcome.NoLikes();
        }
        if (top.size() == 1) {
            return new DeckOutcome.Decided(top.get(0));
        }
        return new DeckOutcome.Runoff(top);
    }
}
