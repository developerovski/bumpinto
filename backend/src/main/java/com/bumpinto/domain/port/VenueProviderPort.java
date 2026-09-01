package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;

import java.util.List;

public interface VenueProviderPort {
    List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type, int limit);
}
