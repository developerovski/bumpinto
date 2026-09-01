package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    String mapsUrl, int deckOrder) {
}
