package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl, String mapsUrl) {
}
