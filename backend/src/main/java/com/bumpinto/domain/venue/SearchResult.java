package com.bumpinto.domain.venue;

import java.util.List;

/** @param quota kaynak telemetri vermiyorsa null (open, TripAdvisor). */
public record SearchResult(List<VenueCandidate> candidates, ProviderQuota quota) {

    public static SearchResult empty() {
        return new SearchResult(List.of(), null);
    }

    public SearchResult {
        candidates = List.copyOf(candidates);
    }
}
