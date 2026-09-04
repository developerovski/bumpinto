package com.bumpinto.adapter.in.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.infra.security.ParticipantPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class SessionViewAssemblerTest {

    static final UUID V1 = UUID.randomUUID();

    SessionViewAssembler assembler = new SessionViewAssembler();

    Session session(SessionType type) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma", ActivityType.COFFEE,
                type, SessionStatus.COLLECTING, Instant.parse("2026-09-02T10:00:00Z"), null, List.of());
    }

    Participant person(UUID sessionId, GeoPoint at, String label, boolean manual) {
        return new Participant(UUID.randomUUID(), sessionId, "P", at, false, null, manual, label, null);
    }

    Venue venue(UUID sessionId, GeoPoint at) {
        return new Venue(UUID.randomUUID(), sessionId, "google", "g1", "Café", at, 4.6, 2,
                null, null, 0);
    }

    @Test
    void participantLocationIsRoundedToTwoDecimalsAndCarriesLabelAndManualFlag() {
        Session s = session(SessionType.SOLO);
        Participant p = person(s.id(), new GeoPoint(51.697812, 5.303749), "'s-Hertogenbosch", true);
        ApiDtos.SessionView view = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(p), List.of(), Map.of(), Map.of(),
                        Map.of()), null);
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
        Participant none = new Participant(UUID.randomUUID(), s.id(), "K", null, false, null,
                false, null, null);

        ApiDtos.SessionView one = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, none), List.of(), Map.of(), Map.of(),
                        Map.of()), null);
        assertThat(one.midpoint()).isNull();
        assertThat(one.radiusKm()).isNull();
        assertThat(one.participants().get(1).approxLocation()).isNull();

        ApiDtos.SessionView two = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, b), List.of(), Map.of(), Map.of(),
                        Map.of()), null);
        assertThat(two.midpoint().lat()).isBetween(51.38, 51.70);
        assertThat(two.midpoint().lng()).isBetween(5.30, 5.72);
        assertThat(two.radiusKm()).isBetween(1.0, 10.0);
    }
    @Test
    void everyParticipantGetsRoundedMinutesFromTheirApproxLocationAndMode() {
        Session s = session(SessionType.GROUP);
        Participant walker = new Participant(UUID.randomUUID(), s.id(), "Yaya",
                new GeoPoint(51.44123, 5.47456), false, null, false, "Eindhoven",
                TravelMode.WALK);
        Participant driver = new Participant(UUID.randomUUID(), s.id(), "Suruc",
                new GeoPoint(51.69781, 5.30374), false, null, false, "Den Bosch",
                TravelMode.CAR);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(walker, driver), List.of(v), Map.of(), Map.of(), Map.of()), null);

        Map<UUID, Integer> minutes = view.venues().get(0).travelMinutes();
        assertThat(minutes).containsOnlyKeys(walker.id(), driver.id());
        assertThat(minutes.values()).allMatch(m -> m % 5 == 0 && m >= 5); // 5 dk basamagi
        // Yaya mekanin dibinde: en kucuk basamak; surucu Den Bosch'tan geliyor: daha uzun
        assertThat(minutes.get(walker.id())).isEqualTo(5);
        assertThat(minutes.get(driver.id())).isGreaterThan(minutes.get(walker.id()));

        ApiDtos.FairnessDto fairness = view.venues().get(0).fairness();
        assertThat(fairness.maxMinutes()).isEqualTo(minutes.get(driver.id()));
        assertThat(fairness.spreadMinutes())
                .isEqualTo(minutes.get(driver.id()) - minutes.get(walker.id()));
        assertThat(fairness.longestParticipantId()).isEqualTo(driver.id());
    }

    /**
     * Kimse konumunu paylasmamissa fairness NULL olmali — {@code (0,0,null)} degil, o "herkes
     * tam esit" gibi okunup yanlis "Herkese ~aynı" rozetini tetikler.
     */
    @Test
    void venueFairnessIsNullWhenNobodyIsLocated() {
        Session s = session(SessionType.GROUP);
        Participant nowhere = new Participant(UUID.randomUUID(), s.id(), "K", null, false,
                null, false, null, null);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(nowhere), List.of(v), Map.of(), Map.of(), Map.of()), null).venues().get(0);

        assertThat(dto.travelMinutes()).isEmpty();
        assertThat(dto.fairness()).isNull();
    }

    @Test
    void minutesComeFromTheRoundedLocationForTheViewerToo() {
        // Gizlilik (spec §4.4): tek kod yolu. Ayni yuvarlama kutusundaki iki farkli tam
        // koordinat AYNI dakikayi verir — viewer icin de.
        Session s = session(SessionType.GROUP);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));
        Participant exact = new Participant(UUID.randomUUID(), s.id(), "A",
                new GeoPoint(51.6978, 5.3037), false, null, false, null, TravelMode.CAR);
        Participant nudged = new Participant(UUID.randomUUID(), s.id(), "B",
                new GeoPoint(51.7019, 5.2962), false, null, false, null, TravelMode.CAR);

        Map<UUID, Integer> minutes = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(exact, nudged), List.of(v), Map.of(), Map.of(), Map.of()), null)
                .venues().get(0).travelMinutes();
        assertThat(minutes.get(exact.id())).isEqualTo(minutes.get(nudged.id()));
    }

    /**
     * Orta nokta dakikasi: Lobi/Bekle kartinin "herkes ~25–35 dk" araligi bu degerlerin
     * min/max'idir. Ayni boylamda iki kisi, e-bisiklet vs araba → agirlikli orta nokta esit
     * sure noktasidir, yani iki dakika da AYNI cikar (5 dk yuvarlamayla).
     */
    @Test
    void midpointMinutesAreEqualForTwoPeopleWithDifferentSpeeds() {
        Session s = session(SessionType.GROUP);
        Participant slow = new Participant(UUID.randomUUID(), s.id(), "E-bisiklet",
                new GeoPoint(51.30, 5.50), false, null, false, null, TravelMode.EBIKE);
        Participant fast = new Participant(UUID.randomUUID(), s.id(), "Araba",
                new GeoPoint(51.70, 5.50), false, null, false, null, TravelMode.CAR);

        List<ApiDtos.ParticipantDto> rows = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(slow, fast), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants();

        assertThat(rows.get(0).midpointMinutes()).isEqualTo(rows.get(1).midpointMinutes());
        assertThat(rows.get(0).midpointMinutes()).isNotNull();
        assertThat(rows.get(0).midpointMinutes() % 5).isZero();
    }

    @Test
    void midpointMinutesIsNullWithoutAMidpointOrWithoutALocation() {
        Session s = session(SessionType.GROUP);
        Participant lonely = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant nowhere = new Participant(UUID.randomUUID(), s.id(), "K", null, false,
                null, false, null, null);

        // Tek konumlu katilimci → orta nokta yok → dakika yok
        assertThat(assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(lonely), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants().get(0).midpointMinutes()).isNull();

        // Iki konumlu + konumsuz bir kisi → konumsuzun dakikasi yok, digerlerininki var
        List<ApiDtos.ParticipantDto> rows = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(lonely, person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false),
                        nowhere), List.of(), Map.of(), Map.of(), Map.of()), null).participants();
        assertThat(rows.get(0).midpointMinutes()).isNotNull();
        assertThat(rows.get(2).midpointMinutes()).isNull();
    }

    /**
     * Runoff'ta kendi seçimi görüntüleyene GERİ DÖNMELİ: seçim yalnız istemcinin useState'inde
     * yaşarsa sayfa yenilenince kaybolur ve kişi neyi kilitlediğini göremez. Başkalarının seçimi
     * sızmaz — o bilinçli olarak sonuca saklı (runoff.note).
     */
    @Test
    void viewerGetsItsOwnRunoffPickButNotTheOthers() {
        Session s = session(SessionType.GROUP);
        Participant me = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        Participant other = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        UUID myPick = UUID.randomUUID();
        UUID theirPick = UUID.randomUUID();
        var snap = new SessionQueries.SessionSnapshot(s, List.of(me, other), List.of(), Map.of(),
                Map.of(me.id(), myPick, other.id(), theirPick), Map.of());

        ApiDtos.SessionView view = assembler.toView(snap, authFor(me));

        assertThat(view.viewer().runoffVoteVenueId()).isEqualTo(myPick);
        assertThat(view.runoffVotedParticipantIds()).containsExactlyInAnyOrder(me.id(), other.id());
        assertThat(view.toString()).doesNotContain(theirPick.toString());
    }

    @Test
    void runoffResponseCarriesWhoLockedButNeverWhatOthersPicked() throws Exception {
        Session s = new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.RUNOFF,
                Instant.parse("2026-09-04T10:00:00Z"), null, List.of(V1),
                null, null, RunoffReason.INTERSECTION, "Eindhoven");
        Participant me = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant other = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(me, other), List.of(), Map.of(), Map.of(me.id(), V1, other.id(), V1),
                Map.of()), authFor(me));

        assertThat(view.runoffVotedParticipantIds()).containsExactlyInAnyOrder(me.id(), other.id());
        assertThat(view.viewer().runoffVoteVenueId()).isEqualTo(V1);
        assertThat(view.voteTally()).isEmpty();
        assertThat(view.runoffReason()).isEqualTo(RunoffReason.INTERSECTION);
        assertThat(view.midpointLabel()).isEqualTo("Eindhoven");
        // Regresyon kapisi: govdede baskasinin secimi HIC gecmez.
        String body = new ObjectMapper().findAndRegisterModules().writeValueAsString(view);
        assertThat(body).doesNotContain("runoffVotes");
    }

    @Test
    void venueDtoCarriesProviderFieldsAndFallsBackToDirectionsUrl() {
        Session s = session(SessionType.GROUP);
        Participant a = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant b = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);
        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "f1", "Café Berlage",
                new GeoPoint(51.4412, 5.4712), null, null, null, null, 0,
                "Coffee Shop", "Eindhoven", "Eindhoven", null, null, "https://berlage.nl");

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(a, b), List.of(v), Map.of(), Map.of(), Map.of()), null).venues().get(0);

        assertThat(dto.provider()).isEqualTo("foursquare");
        assertThat(dto.category()).isEqualTo("Coffee Shop");
        assertThat(dto.address()).isEqualTo("Eindhoven");
        assertThat(dto.locality()).isEqualTo("Eindhoven");
        assertThat(dto.ratingCount()).isNull();
        assertThat(dto.hoursToday()).isNull();
        assertThat(dto.placeLink()).isEqualTo("https://berlage.nl");
        // mapsUrl bos → yol tarifi baglantisi turetilir (spec §5.A.6; "Yol tarifi al" olu kalmaz)
        assertThat(dto.mapsUrl())
                .isEqualTo("https://www.google.com/maps/dir/?api=1&destination=51.4412,5.4712");
    }

    private static UsernamePasswordAuthenticationToken authFor(Participant participant) {
        return new UsernamePasswordAuthenticationToken(
                new ParticipantPrincipal(participant.id(), participant.sessionId(), false), null,
                List.of());
    }
}
