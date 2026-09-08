package com.bumpinto.domain.geo;

/** estimated = haversine tahmini; OSRM yok ya da TRANSIT. */
public record TravelLeg(int minutes, boolean estimated) {
}
