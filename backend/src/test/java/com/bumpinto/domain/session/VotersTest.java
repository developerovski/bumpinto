package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VotersTest {

    private static final GeoPoint AMSTERDAM = new GeoPoint(52.3676, 4.9041);

    private static Session session(GeoPoint anchor) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of(),
                null, null, null, null, anchor);
    }

    private static Participant person(GeoPoint location, boolean manual) {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "Ali", location, false,
                null, manual, null, TravelMode.CAR, null);
    }

    /** Capali oturumda merkez katilimcilardan turemiyor: konum artik uyeligin degil yalniz
        gosterimin girdisi, dolayisiyla konumsuz kisi TAM uyedir (spec K1). */
    @Test
    void anchoredSessionCountsParticipantWithoutLocation() {
        assertThat(Voters.votes(person(null, false), session(AMSTERDAM))).isTrue();
    }

    /** Capasizda orta nokta konumlardan turedigi icin konumsuz kisi temsil EDILEMEZ. */
    @Test
    void unanchoredSessionStillRequiresLocation() {
        assertThat(Voters.votes(person(null, false), session(null))).isFalse();
    }

    /** Elle eklenen nokta HICBIR modda oy vermez: token tasimaz, kaydirmaz. */
    @Test
    void manualPointNeverVotes() {
        assertThat(Voters.votes(person(AMSTERDAM, true), session(AMSTERDAM))).isFalse();
        assertThat(Voters.votes(person(AMSTERDAM, true), session(null))).isFalse();
    }

    /** of(...) ayni kurali listeye uygular — cagiranlar kendi filtresini yazmasin diye. */
    @Test
    void ofFiltersWithTheSameRule() {
        Participant located = person(AMSTERDAM, false);
        Participant locationless = person(null, false);
        Participant manual = person(AMSTERDAM, true);

        assertThat(Voters.of(session(AMSTERDAM), List.of(located, locationless, manual)))
                .containsExactly(located, locationless);
        assertThat(Voters.of(session(null), List.of(located, locationless, manual)))
                .containsExactly(located);
    }
}
