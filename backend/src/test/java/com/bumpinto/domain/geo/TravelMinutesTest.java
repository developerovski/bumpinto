package com.bumpinto.domain.geo;

import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.domain.session.Participant;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** TravelMinutes.byParticipant(located, venues, routing): OSRM /table T10 kablosu. */
class TravelMinutesTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);
    static final GeoPoint VENUE = new GeoPoint(51.44, 5.47);

    static Participant participant(TravelMode mode, GeoPoint at) {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "P", at, false, null,
                false, null, mode);
    }

    /** Cagrilari kaydeder; mod basina onceden hazirlanmis matris doner (yoksa bos). */
    static final class RecordingRouting implements RoutingPort {

        record Call(TravelMode mode, int destinations) {
        }

        final List<Call> calls = new ArrayList<>();
        final Map<TravelMode, int[][]> canned;

        RecordingRouting(Map<TravelMode, int[][]> canned) {
            this.canned = canned;
        }

        @Override
        public Optional<int[][]> durationsSeconds(List<GeoPoint> sources, List<GeoPoint> destinations,
                                                   TravelMode mode) {
            calls.add(new Call(mode, destinations.size()));
            int[][] matrix = canned.get(mode);
            return matrix == null ? Optional.empty() : Optional.of(matrix);
        }
    }

    @Test
    void asksTheRoutingPortOncePerModeNotOncePerVenue() {
        Participant walker1 = participant(TravelMode.WALK, DEN_BOSCH);
        Participant walker2 = participant(TravelMode.WALK, SOMEREN);
        Participant driver = participant(TravelMode.CAR, DEN_BOSCH);
        List<GeoPoint> venues = List.of(VENUE, DEN_BOSCH, SOMEREN);
        RecordingRouting routing = new RecordingRouting(Map.of());

        TravelMinutes.byParticipant(List.of(walker1, walker2, driver), venues, routing);

        assertThat(routing.calls).hasSize(2);
        assertThat(routing.calls).extracting(RecordingRouting.Call::mode)
                .containsExactlyInAnyOrder(TravelMode.WALK, TravelMode.CAR);
        assertThat(routing.calls).allMatch(c -> c.destinations() == 3);
    }

    @Test
    void usesRealDurationsAndScalesEbike() {
        Participant walker = participant(TravelMode.WALK, DEN_BOSCH);
        RecordingRouting walkerRouting = new RecordingRouting(
                Map.of(TravelMode.WALK, new int[][] {{760, 60}}));

        List<Map<UUID, TravelLeg>> legs = TravelMinutes.byParticipant(List.of(walker),
                List.of(VENUE, SOMEREN), walkerRouting);

        assertThat(legs.get(0).get(walker.id())).isEqualTo(new TravelLeg(15, false));
        assertThat(legs.get(1).get(walker.id())).isEqualTo(new TravelLeg(5, false));

        // e-bisiklet OSRM'de yok: bisiklet profiliyle sorulur, sonuc 16/24 oraniyla olceklenir.
        Participant ebiker = participant(TravelMode.EBIKE, DEN_BOSCH);
        RecordingRouting ebikeRouting = new RecordingRouting(
                Map.of(TravelMode.BIKE, new int[][] {{1800}}));

        List<Map<UUID, TravelLeg>> ebikeLegs = TravelMinutes.byParticipant(List.of(ebiker),
                List.of(VENUE), ebikeRouting);

        assertThat(ebikeLegs.get(0).get(ebiker.id())).isEqualTo(new TravelLeg(20, false));
        assertThat(ebikeRouting.calls).hasSize(1);
        assertThat(ebikeRouting.calls.get(0).mode()).isEqualTo(TravelMode.BIKE);
    }

    @Test
    void fallsBackToHaversineWhenRoutingIsAbsentOrModeIsTransit() {
        Participant walker = participant(TravelMode.WALK, DEN_BOSCH);
        Participant transitRider = participant(TravelMode.TRANSIT, SOMEREN);
        RecordingRouting routing = new RecordingRouting(Map.of()); // OSRM yok: her mod bos doner

        List<Map<UUID, TravelLeg>> legs = TravelMinutes.byParticipant(
                List.of(walker, transitRider), List.of(VENUE), routing);

        TravelLeg walkerLeg = legs.get(0).get(walker.id());
        assertThat(walkerLeg.estimated()).isTrue();
        assertThat(walkerLeg.minutes())
                .isEqualTo(TravelMinutes.between(walker.location(), TravelMode.WALK, VENUE));

        TravelLeg transitLeg = legs.get(0).get(transitRider.id());
        assertThat(transitLeg.estimated()).isTrue();
        // TRANSIT rota servisi hic sorulmaz (GTFS ayri is): yalniz WALK icin cagri var.
        assertThat(routing.calls).extracting(RecordingRouting.Call::mode)
                .containsExactly(TravelMode.WALK);
    }
}
