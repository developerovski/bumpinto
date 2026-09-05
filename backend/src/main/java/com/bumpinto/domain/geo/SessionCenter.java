package com.bumpinto.domain.geo;

import com.bumpinto.domain.session.Participant;

import java.util.List;

/**
 * Oturumun merkezi ve arama yaricapi — TEK kaynak. Once DeckFlow ve SessionViewAssembler
 * ayni hesabi kopyalayarak yapiyordu; capa iki yere birden eklenseydi ayrisma riski ikiye
 * cikardi.
 */
public record SessionCenter(GeoPoint point, double radiusKm, boolean anchored) {

    /**
     * Capali oturumun sabit yaricapi. Capa bir YER'dir, bir uzlasma degil: yayilim kurali
     * ("en uzak katilimcinin ceyregi") Amsterdam capasi + daginik katilimcilarda tabani
     * 10 km'ye cakip 40 km'ye kadar genisletirdi. Kirsal capada mekan cikmazsa
     * {@link SearchRadius#expandedKm} zaten x2 aciyor.
     */
    static final double ANCHOR_RADIUS_KM = 2.0;

    /** Capa varsa o; yoksa >=2 konumlu katilimcinin agirlikli centroid'i; ikisi de yoksa null. */
    public static SessionCenter of(GeoPoint anchor, List<Participant> located) {
        if (anchor != null) {
            return new SessionCenter(anchor, ANCHOR_RADIUS_KM, true);
        }
        if (located.size() < 2) {
            return null;
        }
        List<GeoPoint> points = located.stream().map(Participant::location).toList();
        // Hiza TERS agirlik (spec §4.5b): yavas gelen orta noktayi kendine ceker.
        GeoPoint center = GeoMath.centroid(points,
                located.stream().map(p -> p.travelMode().weight()).toList());
        return new SessionCenter(center, SearchRadius.baseKm(points, center), false);
    }
}
