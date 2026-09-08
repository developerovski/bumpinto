package com.bumpinto.adapter.in.web;

import org.springframework.security.oauth2.jwt.Jwt;
import com.bumpinto.application.safety.Blocks;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.PresenceStampsPort;
import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.TaglineSource;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.voice.Seat;
import com.bumpinto.infra.security.ParticipantPrincipal;
import com.bumpinto.support.FakeStores;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class SessionViewAssemblerTest {

    static final UUID V1 = UUID.randomUUID();

    FakeStores.FakePresence presence = new FakeStores.FakePresence();
    FakeStores.FakeVoiceRooms rooms = new FakeStores.FakeVoiceRooms();
    RoutingPort routing = (s, d, m) -> Optional.empty();
    Blocks blocks = mock(Blocks.class);
    PresenceStampsPort stamps = mock(PresenceStampsPort.class);
    SessionViewAssembler assembler =
            new SessionViewAssembler(presence, rooms, routing, blocks, stamps);

    Session session(SessionType type) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE),
                type, SessionStatus.COLLECTING, Instant.parse("2026-09-02T10:00:00Z"), null, List.of());
    }

    Participant person(UUID sessionId, GeoPoint at, String label, boolean manual) {
        return new Participant(UUID.randomUUID(), sessionId, "P", at, false, null, manual, label, null);
    }

    Venue venue(UUID sessionId, GeoPoint at) {
        return new Venue(UUID.randomUUID(), sessionId, "google", "g1", "Café", at, 4.6, 2,
                null, 0, null, null, null, null, null, "https://maps.example/place/g1",
                null, 0.8, 10, null);
    }

    Venue venue(String externalId, ActivityType activityType) {
        return new Venue(UUID.randomUUID(), UUID.randomUUID(), "google", externalId, "V",
                new GeoPoint(51.44, 5.47), 4.6, 2, null, 0,
                null, null, null, null, null, null, activityType, null, null, null);
    }

    SessionQueries.SessionSnapshot snapshotWith(List<ActivityType> activityTypes,
            SessionStatus status, List<Venue> venues) {
        Session s = new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                activityTypes, SessionType.GROUP, status,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of());
        return new SessionQueries.SessionSnapshot(s, List.of(), venues, Map.of(), Map.of(),
                Map.of());
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

    /** OSRM gercek sure dondurdugunde travel[].estimated hepsi false olmali (haversine degil). */
    @Test
    void travelIsRealWhenRoutingAnswers() {
        Session s = session(SessionType.GROUP);
        Participant walker = new Participant(UUID.randomUUID(), s.id(), "Yaya",
                new GeoPoint(51.44123, 5.47456), false, null, false, "Eindhoven", TravelMode.WALK);
        Participant driver = new Participant(UUID.randomUUID(), s.id(), "Suruc",
                new GeoPoint(51.69781, 5.30374), false, null, false, "Den Bosch", TravelMode.CAR);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));
        RoutingPort canned = (sources, destinations, mode) -> switch (mode) {
            case WALK -> Optional.of(new int[][] {{300}}); // 5 dk
            case CAR -> Optional.of(new int[][] {{900}}); // 15 dk
            default -> Optional.empty();
        };
        SessionViewAssembler real =
                new SessionViewAssembler(presence, rooms, canned, blocks, stamps);

        ApiDtos.SessionView view = real.toView(new SessionQueries.SessionSnapshot(
                s, List.of(walker, driver), List.of(v), Map.of(), Map.of(), Map.of()), null);

        ApiDtos.VenueDto dto = view.venues().get(0);
        assertThat(dto.travel()).allMatch(t -> !t.estimated());
        assertThat(dto.travelMinutes().get(walker.id())).isEqualTo(5);
        assertThat(dto.travelMinutes().get(driver.id())).isEqualTo(15);
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
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.RUNOFF,
                Instant.parse("2026-09-04T10:00:00Z"), null, List.of(V1),
                null, null, RunoffReason.INTERSECTION, "Eindhoven", null);
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
                new GeoPoint(51.4412, 5.4712), null, null, null, 0,
                "Coffee Shop", "Eindhoven", "Eindhoven", null, null, "https://berlage.nl",
                null, null, null, null);

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(a, b), List.of(v), Map.of(), Map.of(), Map.of()), null).venues().get(0);

        assertThat(dto.provider()).isEqualTo("foursquare");
        assertThat(dto.category()).isEqualTo("Coffee Shop");
        assertThat(dto.address()).isEqualTo("Eindhoven");
        assertThat(dto.locality()).isEqualTo("Eindhoven");
        assertThat(dto.ratingCount()).isNull();
        assertThat(dto.hoursToday()).isNull();
        assertThat(dto.placeLink()).isEqualTo("https://berlage.nl");
        // Uye olmayan (auth null) goruntuleyen icin arac varsayilani CAR'dir (spec §10).
        assertThat(dto.mapsUrl())
                .isEqualTo("https://www.google.com/maps/dir/?api=1&destination=51.4412,5.4712&travelmode=driving");
    }

    /**
     * mapsUrl artik saglayicidan degil, goruntuleyenin ulasim turundan (MapLinks) uretilir
     * (spec §10) — ayni mekan icin herkes kendi turune gore FARKLI baglanti gorur.
     */
    /** "Neyle bilinir" satiri sunucuda turetilir; DTO onu ve KAYNAGINI (atif satiri) tasir. */
    @Test
    void taglineAndSourceReachTheVenueDto() {
        Session s = session(SessionType.GROUP);
        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "x", "Kaffee",
                new GeoPoint(51.4, 5.4), 8.4, 2, null, 0, "Coffee shop", null, "Eindhoven",
                12, null, null, ActivityType.COFFEE, 0.9, 10, null,
                "Best flat white in town", TaglineSource.FSQ);

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(), List.of(v), Map.of(), Map.of(), Map.of()), null).venues().get(0);

        assertThat(dto.tagline()).isEqualTo("Best flat white in town");
        assertThat(dto.taglineSource()).isEqualTo(TaglineSource.FSQ);
    }

    @Test
    void mapsUrlUsesTheViewersTravelModeAndCarriesNewFields() {
        Session s = session(SessionType.GROUP);
        Participant walker = new Participant(UUID.randomUUID(), s.id(), "Yaya",
                new GeoPoint(51.44, 5.47), false, null, false, "Eindhoven", TravelMode.WALK);
        Venue v = venue(s.id(), new GeoPoint(51.4412, 5.4712));

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(walker), List.of(v), Map.of(), Map.of(), Map.of()), authFor(walker))
                .venues().get(0);

        assertThat(dto.mapsUrl()).endsWith("&travelmode=walking");
        assertThat(dto.mapsUrl()).contains("destination=51.4412,5.4712");
        assertThat(dto.placeLink()).isEqualTo(v.placeLink());
        assertThat(dto.ratingScale()).isEqualTo(v.ratingScale());
        assertThat(dto.popularity()).isEqualTo(v.popularity());
        assertThat(dto.travel()).isNotEmpty();
        assertThat(dto.travel()).allMatch(ApiDtos.TravelDto::estimated);
    }

    /** Linki acan katilimci degilse (davet linkiyle bakan misafir) araba varsayilir. */
    @Test
    void mapsUrlFallsBackToDrivingForNonMembers() {
        Session s = session(SessionType.GROUP);
        Participant a = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Venue v = venue(s.id(), new GeoPoint(51.4412, 5.4712));

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(a), List.of(v), Map.of(), Map.of(), Map.of()), null)
                .venues().get(0);

        assertThat(dto.mapsUrl()).endsWith("&travelmode=driving");
    }

    /** Hesap kimligi tasiyan auth: assembler engel sorgusunu bu id ile yapar. */
    private static UsernamePasswordAuthenticationToken accountAuth(UUID userId) {
        return new UsernamePasswordAuthenticationToken(
                Jwt.withTokenValue("t").header("alg", "HS256").subject(userId.toString())
                        .claim("email", "v@bumpinto.test").build(),
                null, List.of());
    }

    /** Engel TEK YON: engelleyen "blocked" gorur, engellenen hicbir isaret gormez. */
    @Test
    void blockedFlagIsSetOnlyForTheViewerWhoBlocked() {
        UUID viewerUser = UUID.randomUUID();
        Session s = session(SessionType.GROUP);
        Participant them = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant mine = person(s.id(), new GeoPoint(51.45, 5.48), "Eindhoven", false);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(
                s, List.of(them, mine), List.of(), Map.of(), Map.of(), Map.of());
        when(blocks.hiddenParticipantIds(eq(viewerUser), any(), any()))
                .thenReturn(Set.of(them.id()));

        ApiDtos.SessionView view = assembler.toView(snap, accountAuth(viewerUser));

        assertThat(view.participants()).filteredOn(p -> p.id().equals(them.id()))
                .extracting(ApiDtos.ParticipantDto::blocked).containsExactly(true);
        assertThat(view.participants()).filteredOn(p -> !p.id().equals(them.id()))
                .extracting(ApiDtos.ParticipantDto::blocked).containsOnly(false);
    }

    private static UsernamePasswordAuthenticationToken authFor(Participant participant) {
        return new UsernamePasswordAuthenticationToken(
                new ParticipantPrincipal(participant.id(), participant.sessionId(), false), null,
                List.of());
    }

    @Test
    void onlineIsTrueOnlyForParticipantsWithAnOpenSocket() {
        Session s = session(SessionType.GROUP);
        Participant here = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);
        Participant gone = person(s.id(), new GeoPoint(51.38, 5.71), "Someren", false);
        presence.arrived(s.id(), here.id(), "ws-here");

        ApiDtos.SessionView view = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(here, gone), List.of(), Map.of(),
                        Map.of(), Map.of()), null);

        assertThat(view.participants()).extracting(ApiDtos.ParticipantDto::id,
                        ApiDtos.ParticipantDto::online)
                .containsExactlyInAnyOrder(tuple(here.id(), true), tuple(gone.id(), false));
    }

    /**
     * "Son gorulen · 12:38" cevrimdisi kisi icin YAZILIR: damga presence koltugunun omrunden
     * bagimsizdir, yoksa satirda anlatilacak hicbir sey kalmazdi.
     */
    @Test
    void offlineParticipantCarriesLastSeenAndLinkOpenedStamps() {
        Session s = session(SessionType.GROUP);
        Participant ayse = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        Instant seen = Instant.parse("2026-09-06T12:38:00Z");
        Instant opened = Instant.parse("2026-09-06T12:10:00Z");
        when(stamps.stampsOf(any()))
                .thenReturn(Map.of(ayse.id(), new PresenceStampsPort.Stamps(seen, opened)));

        ApiDtos.ParticipantDto row = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(ayse), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants().stream().filter(p -> p.id().equals(ayse.id()))
                .findFirst().orElseThrow();

        assertThat(row.online()).isFalse();
        assertThat(row.lastSeenAt()).isEqualTo(seen);
        assertThat(row.linkOpenedAt()).isEqualTo(opened);
    }

    /** Damgasi olmayan koltuk haritada YOK: "hic gorulmedi" null'dur, sifir zaman degil. */
    @Test
    void participantWithoutStampsCarriesNulls() {
        Session s = session(SessionType.GROUP);
        Participant ayse = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        when(stamps.stampsOf(any())).thenReturn(Map.of());

        ApiDtos.ParticipantDto row = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(ayse), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants().get(0);

        assertThat(row.lastSeenAt()).isNull();
        assertThat(row.linkOpenedAt()).isNull();
    }

    @Test
    void voiceIsNullWhenClosedAndCarriesEndsAtAndMembersWhenOpen() {
        Session s = session(SessionType.GROUP);
        Participant ayse = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        Participant mehmet = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(s,
                List.of(ayse, mehmet), List.of(), Map.of(), Map.of(), Map.of());

        ApiDtos.SessionView closed = assembler.toView(snap, null);
        assertThat(closed.voice()).isNull();
        assertThat(closed.participants()).noneMatch(ApiDtos.ParticipantDto::inVoice);

        Instant endsAt = Instant.parse("2026-09-06T12:00:00Z");
        rooms.open(s.id(), "s1", endsAt, () -> { });
        rooms.join(s.id(), ayse.id(), new Seat("ws-1", "sub-1"));
        ApiDtos.SessionView open = assembler.toView(snap, null);
        assertThat(open.voice().endsAt()).isEqualTo(endsAt);
        assertThat(open.participants().stream().filter(ApiDtos.ParticipantDto::inVoice)
                .map(ApiDtos.ParticipantDto::id)).containsExactly(ayse.id());
    }

    /**
     * R-B9 gizlilik siniri: kod UYEYE gider, uye olmayana GITMEZ ve onizlemede HIC yer almaz.
     * Uc zaten uye olmayana 403 veriyor ama alan viewer'a bagli olmasaydi, ileride acilacak
     * herhangi bir "uyesiz gorunum" kodu sessizce disari tasirdi. Onizleme tarafi ayrica
     * govde uzerinden sinanir: koda karsi kod aramasi yasaktir (§2).
     */
    @Test
    void joinCodeGoesToMembersOnlyAndNeverIntoThePreview() throws Exception {
        Session base = session(SessionType.GROUP);
        Session s = new Session(base.id(), base.slug(), base.hostId(), base.name(),
                base.activityTypes(), base.sessionType(), base.status(), base.expiresAt(),
                null, List.of(), null, null, null, null, null, "X7K2M");
        Participant me = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(
                s, List.of(me), List.of(), Map.of(), Map.of(), Map.of());

        assertThat(assembler.toView(snap, authFor(me)).joinCode()).isEqualTo("X7K2M");
        assertThat(assembler.toView(snap, null).joinCode()).isNull();

        String preview = new ObjectMapper().findAndRegisterModules()
                .writeValueAsString(assembler.toPreview(snap));
        assertThat(preview).doesNotContain("X7K2M").doesNotContain("joinCode");
    }

    @Test
    void previewReportsWhetherTheHostIsOnline() {
        Session s = session(SessionType.GROUP);
        Participant host = new Participant(UUID.randomUUID(), s.id(), "Mehmet",
                new GeoPoint(51.69, 5.30), true, null, false, "Den Bosch", null);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(s,
                List.of(host), List.of(), Map.of(), Map.of(), Map.of());

        assertThat(assembler.toPreview(snap).hostOnline()).isFalse();

        presence.arrived(s.id(), host.id(), "ws-host");
        assertThat(assembler.toPreview(snap).hostOnline()).isTrue();
    }

    /**
     * Secili ama hic mekan uretmemis alan kullaniciya SOYLENIR. Ek cagri yapilmadigi icin
     * (Places kredisi sinirli) sessizce eksik kalmasi kabul edilemez; ekran "hike icin
     * yakinda yer bulunamadi" yazabilsin diye alan turetilir -- depolanmaz.
     */
    @Test
    void reportsSelectedActivitiesThatProducedNoVenues() {
        SessionQueries.SessionSnapshot snap = snapshotWith(
                List.of(ActivityType.COFFEE, ActivityType.HIKE),
                SessionStatus.BROWSING,
                List.of(venue("cafe0", ActivityType.COFFEE)));

        assertThat(assembler.toView(snap, null).emptyActivityTypes())
                .containsExactly(ActivityType.HIKE);
    }

    /**
     * Deste dolu ama HICBIR mekan atfedilememis: "hepsi bos" demek ekranda 20 mekan
     * dururken "hicbiri bulunamadi" yazmak olurdu. Atif sinyali yoksa susariz.
     */
    @Test
    void staysSilentWhenNoVenueCouldBeAttributedAtAll() {
        SessionQueries.SessionSnapshot snap = snapshotWith(
                List.of(ActivityType.COFFEE, ActivityType.HIKE),
                SessionStatus.BROWSING,
                List.of(venue("ghost0", null), venue("ghost1", null)));

        assertThat(assembler.toView(snap, null).emptyActivityTypes()).isEmpty();
    }

    /** BROWSING oncesi deste HENUZ yok: "hepsi bos" demek yanlis olurdu. */
    @Test
    void reportsNoEmptyActivitiesBeforeTheDeckExists() {
        SessionQueries.SessionSnapshot snap = snapshotWith(
                List.of(ActivityType.COFFEE, ActivityType.HIKE),
                SessionStatus.COLLECTING, List.of());

        assertThat(assembler.toView(snap, null).emptyActivityTypes()).isEmpty();
    }

    /** Capa host'un ACIKCA yazdigi kamu bilgisi: yuvarlamak harita cemberini secilen
        yerden ~1 km kaydirirdi ve korudugu bir sey yok. */
    @Test
    void anchoredMidpointIsExactAndFlagged() {
        GeoPoint amsterdam = new GeoPoint(52.36761, 4.90412);
        Session s = new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", amsterdam);

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(), List.of(), Map.of(), Map.of(), Map.of()), null);

        assertThat(view.anchored()).isTrue();
        assertThat(view.midpoint().lat()).isEqualTo(52.36761);
        assertThat(view.midpoint().lng()).isEqualTo(4.90412);
        // SessionCenter.ANCHOR_RADIUS_KM paket-ozel: bu katmandan okunamaz, 2.0 yazilir.
        assertThat(view.radiusKm()).isEqualTo(2.0);
    }

    /** Capasiz oturumda yuvarlama AYNEN durur — gizlilik kurali degismedi. */
    @Test
    void unanchoredMidpointStaysRounded() {
        Session s = new Session(UUID.randomUUID(), "s2", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(3600), null, List.of());

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false),
                        person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false)),
                List.of(), Map.of(), Map.of(), Map.of()), null);

        assertThat(view.anchored()).isFalse();
        // 2 ondalik = ~1 km (TravelMinutes.approx)
        assertThat(view.midpoint().lat()).isEqualTo(Math.round(view.midpoint().lat() * 100) / 100.0);
    }
}
