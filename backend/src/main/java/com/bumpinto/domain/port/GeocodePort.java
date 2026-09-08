package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.GeoResult;

import java.util.Optional;

/** Metinden koordinat. {@code bias} varsa o noktanin cevresine oncelik verilir. Basarisizlik NORMALDIR: cagiran 404 doner. */
public interface GeocodePort {

    Optional<GeoResult> forward(String query, GeoPoint bias);
}
