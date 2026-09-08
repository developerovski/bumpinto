package com.bumpinto.domain.geo;

import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.domain.session.Participant;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Katilimci → mekan dakikasi. Spec §4.4 + §4.5b: dakika HER ZAMAN yuvarlanmis konumdan
 * (viewer dahil, tek kod yolu) ve kisinin ulasim moduyla hesaplanir, sonra 5 dk basamagina
 * yuvarlanir. Chips, adalet rozeti ve deste sirasi ayni sayiyi kullanir.
 */
public final class TravelMinutes {

    /** Spec §4.3: "~" onekiyle gosterilen yalanci hassasiyetsiz basamak. */
    public static final int STEP = 5;

    /** e-bisiklet OSRM'de yok: bisiklet matrisi hiz oraniyla olceklenir (16/24). */
    private static final double EBIKE_FACTOR = TravelMode.BIKE.kmh() / TravelMode.EBIKE.kmh();

    private TravelMinutes() {
    }

    public static int between(GeoPoint from, TravelMode mode, GeoPoint to) {
        int raw = TravelEstimate.fromCrowKm(GeoMath.distanceKm(approx(from), to), mode).minutes();
        return round(raw);
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti (spec §8 gizlilik kutusu). */
    public static GeoPoint approx(GeoPoint p) {
        return new GeoPoint(Math.round(p.lat() * 100) / 100.0, Math.round(p.lng() * 100) / 100.0);
    }

    /**
     * Oturum basina MOD basina TEK matris (OSRM /table NxM icin tasarlandi).
     * @return venues ile AYNI sirada, her mekan icin katilimci -> bacak
     */
    public static List<Map<UUID, TravelLeg>> byParticipant(List<Participant> located, List<GeoPoint> venues, RoutingPort routing) {
        List<Map<UUID, TravelLeg>> out = new ArrayList<>(venues.size());
        for (int i = 0; i < venues.size(); i++) {
            out.add(new LinkedHashMap<>());
        }
        Map<TravelMode, List<Participant>> byMode = located.stream()
                .collect(Collectors.groupingBy(Participant::travelMode, LinkedHashMap::new, Collectors.toList()));
        byMode.forEach((mode, people) -> {
            List<GeoPoint> sources = people.stream().map(p -> approx(p.location())).toList();
            // TRANSIT'te rota servisi yok (GTFS ayri is): tahmin kalir.
            Optional<int[][]> matrix = mode == TravelMode.TRANSIT || venues.isEmpty() ? Optional.empty()
                    : routing.durationsSeconds(sources, venues, profileOf(mode));
            for (int p = 0; p < people.size(); p++) {
                Participant person = people.get(p);
                for (int v = 0; v < venues.size(); v++) {
                    out.get(v).put(person.id(), leg(matrix, mode, p, v, person, venues.get(v)));
                }
            }
        });
        return out;
    }

    private static TravelMode profileOf(TravelMode mode) {
        return mode == TravelMode.EBIKE ? TravelMode.BIKE : mode;
    }

    private static TravelLeg leg(Optional<int[][]> matrix, TravelMode mode, int p, int v, Participant person, GeoPoint venue) {
        if (matrix.isPresent() && matrix.get().length > p && matrix.get()[p].length > v && matrix.get()[p][v] >= 0) {
            double seconds = matrix.get()[p][v];
            if (mode == TravelMode.EBIKE) {
                seconds *= EBIKE_FACTOR;
            }
            return new TravelLeg(round(seconds / 60.0), false);
        }
        return new TravelLeg(between(person.location(), mode, venue), true);
    }

    /** 5 dk basamagi ve "~0 dk yoktur" kurali tek yerde. */
    private static int round(double minutes) {
        return Math.max(STEP, Math.round((float) minutes / STEP) * STEP);
    }
}
