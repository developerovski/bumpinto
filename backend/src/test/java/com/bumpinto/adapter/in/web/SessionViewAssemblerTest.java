package com.bumpinto.adapter.in.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionViewAssemblerTest {

    SessionViewAssembler assembler = new SessionViewAssembler();

    Session session(SessionType type) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma", ActivityType.COFFEE,
                type, SessionStatus.COLLECTING, Instant.parse("2026-09-02T10:00:00Z"), null, List.of());
    }

    Participant person(UUID sessionId, GeoPoint at, String label, boolean manual) {
        return new Participant(UUID.randomUUID(), sessionId, "P", at, false,
                manual ? null : "tok", null, manual, label);
    }

    @Test
    void participantLocationIsRoundedToTwoDecimalsAndCarriesLabelAndManualFlag() {
        Session s = session(SessionType.SOLO);
        Participant p = person(s.id(), new GeoPoint(51.697812, 5.303749), "'s-Hertogenbosch", true);
        ApiDtos.SessionView view = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(p), List.of(), Map.of(), Set.of()), null);
        ApiDtos.ParticipantDto dto = view.participants().get(0);
        assertThat(dto.approxLocation().lat()).isEqualTo(51.70);
        assertThat(dto.approxLocation().lng()).isEqualTo(5.30);
        assertThat(dto.locationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(dto.manual()).isTrue();
        assertThat(view.sessionType()).isEqualTo(SessionType.SOLO);
    }

    @Test
    void midpointAndRadiusAppearOnlyWithTwoLocatedParticipants() {
        Session s = session(SessionType.GROUP);
        Participant a = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        Participant b = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        Participant none = new Participant(UUID.randomUUID(), s.id(), "K", null, false, "t", null,
                false, null);

        ApiDtos.SessionView one = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, none), List.of(), Map.of(), Set.of()), null);
        assertThat(one.midpoint()).isNull();
        assertThat(one.radiusKm()).isNull();
        assertThat(one.participants().get(1).approxLocation()).isNull();

        ApiDtos.SessionView two = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, b), List.of(), Map.of(), Set.of()), null);
        assertThat(two.midpoint().lat()).isBetween(51.38, 51.70);
        assertThat(two.midpoint().lng()).isBetween(5.30, 5.72);
        assertThat(two.radiusKm()).isBetween(1.0, 10.0);
    }
}
