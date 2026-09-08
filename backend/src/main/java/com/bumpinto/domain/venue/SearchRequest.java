package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;

import java.util.List;

public record SearchRequest(GeoPoint center, double radiusKm, List<ActivityType> types, int limit) {

    public SearchRequest {
        types = List.copyOf(types);
    }
}
