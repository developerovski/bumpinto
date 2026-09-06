package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.util.List;
import java.util.Optional;

/** Kaynak x hedef sure matrisi (saniye). Servis yoksa/yavassa empty — cagiran haversine tahminine duser. */
public interface RoutingPort {

    Optional<int[][]> durationsSeconds(List<GeoPoint> sources, List<GeoPoint> destinations, TravelMode mode);
}
