package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;

import java.util.List;

public interface VenueProviderPort {
    /** {@code types} bos olamaz; en fazla 3 eleman (API katmani dogrular). */
    List<VenueCandidate> search(GeoPoint center, double radiusKm, List<ActivityType> types,
                                int limit);
}
