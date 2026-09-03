package com.bumpinto.domain.geo;

import com.bumpinto.domain.session.Participant;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Katilimci → mekan dakikasi. Spec §4.4 + §4.5b: dakika HER ZAMAN yuvarlanmis konumdan
 * (viewer dahil, tek kod yolu) ve kisinin ulasim moduyla hesaplanir, sonra 5 dk basamagina
 * yuvarlanir. Chips, adalet rozeti ve deste sirasi ayni sayiyi kullanir.
 */
public final class TravelMinutes {

    /** Spec §4.3: "~" onekiyle gosterilen yalanci hassasiyetsiz basamak. */
    public static final int STEP = 5;

    private TravelMinutes() {
    }

    public static int between(GeoPoint from, TravelMode mode, GeoPoint to) {
        int raw = TravelEstimate.fromCrowKm(GeoMath.distanceKm(approx(from), to), mode).minutes();
        int rounded = Math.round(raw / (float) STEP) * STEP;
        // "~0 dk" diye bir sey yok: konum zaten ~1 km yuvarlanmis, en kucuk basamak bir adimdir.
        return Math.max(STEP, rounded);
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti (spec §8 gizlilik kutusu). */
    public static GeoPoint approx(GeoPoint p) {
        return new GeoPoint(Math.round(p.lat() * 100) / 100.0, Math.round(p.lng() * 100) / 100.0);
    }

    /**
     * Bir mekan icin TEK dakika kaynagi: assembler ve DeckFlow adalet siralamasi ayni haritayi
     * uretsin diye burada toplandi (once ikisi ayri ayri forEach yaziyordu — kopya kayma riski).
     */
    public static Map<UUID, Integer> byParticipant(List<Participant> located, GeoPoint venue) {
        Map<UUID, Integer> minutes = new LinkedHashMap<>();
        located.forEach(p -> minutes.put(p.id(), between(p.location(), p.travelMode(), venue)));
        return minutes;
    }
}
