package com.bumpinto.domain.geo;

/** Throttle penceresi dolu: "sonuc yok" ile karistirilmasin diye ayri tip. */
public class GeocodeBusyException extends RuntimeException {

    public GeocodeBusyException() {
        super("geocode throttled");
    }
}
