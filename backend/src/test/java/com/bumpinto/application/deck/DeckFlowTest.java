package com.bumpinto.application.deck;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NoVenuesFoundException;
import com.bumpinto.domain.deck.DecisionEngine;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeckFlowTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    FakeStores.InMemorySessionStore store;
    FakeStores.InMemoryDeckStore deck;
    FakeStores.RecordingEvents events;
    FakeStores.FakeReverseGeocoder geocoder;
    FakeStores.FakePresence presence;
    List<Double> requestedRadii;
    List<VenueCandidate> providerResult;
    DeckFlow flow;
    Clock clock;
    UUID hostUser;
    Session session;
    Participant host;
    Participant ayse;

    static VenueCandidate cand(int i, double rating) {
        return new VenueCandidate("foursquare", "fsq-" + i, "Mekan " + i,
                new GeoPoint(51.5 + i * 0.001, 5.5), rating, 2, null, "https://maps/" + i);
    }

    static VenueCandidate candAt(int i, double rating, GeoPoint at) {
        return new VenueCandidate("foursquare", "x" + i, "Mekan " + i, at, rating, 2, null,
                "https://maps/" + i);
    }

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        deck = new FakeStores.InMemoryDeckStore();
        events = new FakeStores.RecordingEvents();
        geocoder = new FakeStores.FakeReverseGeocoder();
        requestedRadii = new ArrayList<>();
        providerResult = new ArrayList<>();
        VenueProviderPort provider = (center, radiusKm, type, limit) -> {
            requestedRadii.add(radiusKm);
            return List.copyOf(providerResult);
        };
        clock = Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC);
        presence = new FakeStores.FakePresence();
        flow = new DeckFlow(store, deck, provider, events, new DecisionEngine(), clock, geocoder,
                presence);

        hostUser = UUID.randomUUID();
        // Sabit id: shuffle tohumu session.id()'den gelir, rastgele id testi kimlik
        // permutasyonunda nadiren kirardi.
        session = store.saveSession(new Session(
                UUID.fromString("00000000-0000-0000-0000-000000000001"), "s1", hostUser, null,
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of()));
        host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Mehmet", DEN_BOSCH, true, null, false, null, null));
        ayse = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Ayşe", SOMEREN, false, null, false, null, null));
        // Mevcut testler "herkes odada" varsayar; presence kapisi yalnizca kendi testinde bosaltilir.
        presence.arrived(session.id(), host.id(), "ws-host");
        presence.arrived(session.id(), ayse.id(), "ws-ayse");
    }

    /**
     * Oda ici yetkinin YERI: host olmayan bir UYE host eylemlerini suremez. Kontrol web
     * katmanindan buraya tasindi (A5): kimlik artik tek turdur (katilimci token'i) ve "host mu"
     * sorusu imzali claim'e degil, koltugun DB'deki haline bakilarak yanitlanir.
     */
    @Test
    void onlyTheHostSeatCanDriveHostActions() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));

        assertThatThrownBy(() -> flow.findVenues("s1", ayse.id()))
                .isInstanceOf(ForbiddenException.class);
        flow.findVenues("s1", host.id());
        assertThatThrownBy(() -> flow.shuffle("s1", ayse.id()))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> flow.forceDecision("s1", ayse.id(), null))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void findVenuesOrdersDeckByFairnessNotRating() {
        // host Den Bosch (51.6978, 5.3037), ayse Someren (51.3855, 5.7120) — ikisi de CAR.
        // "adil" ikisinin ortasinda, "uzak" Den Bosch'un kuzeyinde; puanlar TERS verildi.
        providerResult.addAll(List.of(
                candAt(0, 3.0, new GeoPoint(51.54, 5.51)),   // adil, dusuk puan
                candAt(1, 4.9, new GeoPoint(51.95, 5.30)),   // uzak, yuksek puan
                candAt(2, 4.5, new GeoPoint(51.52, 5.49)),
                candAt(3, 4.4, new GeoPoint(51.55, 5.53)),
                candAt(4, 4.3, new GeoPoint(51.53, 5.52)),
                candAt(5, 4.2, new GeoPoint(51.56, 5.50))));
        flow.findVenues("s1", host.id());

        List<Venue> deckOrder = deck.venuesOf(session.id());
        assertThat(deckOrder.get(deckOrder.size() - 1).externalId()).isEqualTo("x1"); // uzak sonda
        assertThat(deckOrder.stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2, 3, 4, 5);
    }

    @Test
    void shuffleKeepsFairnessOrderForEveryoneAndPublishesDeckReady() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        flow.findVenues("s1", host.id());
        List<UUID> browsingOrder = deck.venuesOf(session.id()).stream().map(Venue::id).toList();

        flow.shuffle("s1", host.id());

        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.SWIPING);
        // Sira ADALET tarafindan belirlenir; shuffle onu yeniden uygular (konumlar degismis
        // olabilir) — herkes ayni sirayi gorur, tekrar cagirmak sirayi degistirmez.
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::id).toList())
                .isEqualTo(browsingOrder);
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2, 3, 4, 5, 6, 7);
        assertThat(events.published).extracting(p -> p.event().type())
                .containsExactly("venues_ready", "deck_ready");
    }

    /**
     * Esit puanli mekanlarda ayirt edici TEK sey sabit kimlik (externalId) siralamasidir.
     * Saglayici sonucu ALFABETIK OLMAYAN sirada gelir (x3,x1,x4,x2) — findVenues ile shuffle
     * AYNI kanonik sirayi (canonicalOrder) kurmazsa, ilk shuffle browsing destesinden sapar ve
     * tekrar tekrar cagirmak da kendi cikisini surukleyip her seferinde baska sira uretir.
     */
    @Test
    void shuffleStaysIdempotentWhenRatingsTieAndProviderOrderIsNotAlphabetical() {
        providerResult.addAll(List.of(
                candAt(3, 4.0, new GeoPoint(51.501, 5.500)),
                candAt(1, 4.0, new GeoPoint(51.502, 5.500)),
                candAt(4, 4.0, new GeoPoint(51.503, 5.500)),
                candAt(2, 4.0, new GeoPoint(51.504, 5.500))));

        flow.findVenues("s1", host.id());
        List<UUID> browsingOrder = deck.venuesOf(session.id()).stream().map(Venue::id).toList();

        flow.shuffle("s1", host.id());
        assertThat(deck.venuesOf(session.id()).stream().map(Venue::id).toList())
                .isEqualTo(browsingOrder);

        // Ikinci "Karistir ve kaydir": host BROWSING'e donmus gibi tekrar tetikler — sonuc
        // yine AYNI olmali (idempotent), rastgele bir baska permutasyona kaymamali.
        store.saveSession(store.sessionBySlug("s1").orElseThrow().withStatus(SessionStatus.BROWSING));
        flow.shuffle("s1", host.id());
        assertThat(deck.venuesOf(session.id()).stream().map(Venue::id).toList())
                .isEqualTo(browsingOrder);
    }

    @Test
    void shuffleRequiresBrowsingAndHost() {
        assertThatThrownBy(() -> flow.shuffle("s1", host.id()))
                .isInstanceOf(ConflictException.class); // COLLECTING'de deste yok
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        assertThatThrownBy(() -> flow.shuffle("s1", UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void swipingIsRejectedWhileBrowsing() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        assertThatThrownBy(() -> flow.swipe("s1", host.id(), venues.get(0).id(), true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("BROWSING");
    }

    @Test
    void findVenuesExpandsRadiusWhenSparseAndAcceptsSmallDeck() {
        providerResult.addAll(List.of(cand(0, 4.0), cand(1, 4.2), cand(2, 4.4))); // hep 3 sonuç

        List<Venue> venues = flow.findVenues("s1", host.id());

        assertThat(venues).hasSize(3); // az sonuç kabul — istemci liste moduna düşer (spec §4)
        assertThat(requestedRadii).hasSize(4); // taban + 3 genişletme
        assertThat(requestedRadii.get(1)).isCloseTo(requestedRadii.get(0) * 2,
                org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void findVenuesByNonHostIsForbidden() {
        assertThatThrownBy(() -> flow.findVenues("s1", UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void expiredSessionIsRejectedEvenWhenStoredStatusIsCollecting() {
        store.saveSession(new Session(session.id(), "s1", hostUser, null,
                List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-01T09:59:59Z"), null, List.of()));

        assertThatThrownBy(() -> flow.findVenues("s1", host.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("EXPIRED");
    }

    @Test
    void fullSwipeFlowAutoDecidesWhenEveryoneFinishes() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID favori = venues.get(0).id();

        flow.swipe("s1", host.id(), favori, true);
        flow.swipe("s1", host.id(), venues.get(1).id(), false);
        flow.finishDeck("s1", host.id());
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);

        flow.swipe("s1", ayse.id(), favori, true);
        flow.finishDeck("s1", ayse.id());

        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(decided.decidedVenueId()).isEqualTo(favori);
        assertThat(events.published).extracting(p -> p.event().type())
                .contains("deck_progress", "session_decided");
    }

    @Test
    void runoffTieStaysOpenUntilHostForces() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID v0 = venues.get(0).id();
        UUID v1 = venues.get(1).id();

        // ikisi de iki mekanı da beğenir → kesişim 2 → RUNOFF
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), v0, true);
            flow.swipe("s1", p.id(), v1, true);
            flow.finishDeck("s1", p.id());
        }
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.RUNOFF);

        flow.runoffVote("s1", host.id(), v0);
        // Her oy yayinlanir: "kim kilitledi" listesi (SessionView.runoffVoters) aninda degisir,
        // yalniz beraberlikte yayinlamak digerlerini poll'e mahkum ediyordu.
        assertThat(events.published).extracting(p -> p.event().type()).contains("runoff_voted");
        flow.runoffVote("s1", ayse.id(), v1); // beraberlik
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.RUNOFF);
        // Beraberlikte hicbir event yoksa ekranlar 3sn'lik polling'e kalir ve "digerlerini
        // bekliyoruz" der; oysa bekleyecek kimse yoktur — karar host'a gecmistir.
        assertThat(events.published).extracting(p -> p.event().type()).contains("runoff_tie");
        assertThat(events.published.stream()
                .filter(p -> p.event().type().equals("runoff_tie")).findFirst().orElseThrow()
                .event().payload()).containsEntry("finalistCount", 2);

        flow.forceDecision("s1", host.id(), v0);
        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(decided.decidedVenueId()).isEqualTo(v0);
        assertThat(deck.votesByParticipant(session.id()))
                .containsExactlyInAnyOrderEntriesOf(Map.of(host.id(), v0, ayse.id(), v1));
    }

    @Test
    void hostPicksVenueDirectlyWhileBrowsing() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.forceDecision("s1", host.id(), venues.get(1).id());
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decidedVenueId()).isEqualTo(venues.get(1).id());
        assertThat(events.published).extracting(p -> p.event().type()).contains("session_decided");
    }

    @Test
    void pickWhileBrowsingRejectsForeignVenue() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        assertThatThrownBy(() -> flow.forceDecision("s1", host.id(), UUID.randomUUID()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not in this session");
    }

    @Test
    void soloSessionDecidesByPickAndNeverShuffles() {
        Session solo = store.saveSession(new Session(UUID.randomUUID(), "solo", hostUser, null,
                List.of(ActivityType.COFFEE), SessionType.SOLO, SessionStatus.COLLECTING,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of()));
        Participant soloHost = store.saveParticipant(new Participant(UUID.randomUUID(), solo.id(),
                "Mehmet", DEN_BOSCH, true, null, false, "'s-Hertogenbosch", null));
        store.saveParticipant(new Participant(UUID.randomUUID(), solo.id(), "Ayşe", SOMEREN,
                false, null, true, "Someren", null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("solo", soloHost.id());
        assertThat(store.sessionBySlug("solo").orElseThrow().status()).isEqualTo(SessionStatus.BROWSING);
        assertThatThrownBy(() -> flow.shuffle("solo", soloHost.id())).isInstanceOf(ConflictException.class);
        flow.forceDecision("solo", soloHost.id(), venues.get(0).id());
        assertThat(store.sessionBySlug("solo").orElseThrow().status()).isEqualTo(SessionStatus.DECIDED);
    }

    /** deck_progress payload'inin DEGERLERI: konumsuz katilimci ne done'a ne total'e girer. */
    List<Map<String, Object>> progressPayloads() {
        return events.published.stream().map(FakeStores.Published::event)
                .filter(e -> e.type().equals("deck_progress")).map(SessionEvent::payload).toList();
    }

    @Test
    void participantWithoutLocationNeitherCountsNorFinishesTheDeck() {
        Participant kerem = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Kerem", null, false, null, false, null, null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID favori = venues.get(0).id();

        flow.swipe("s1", host.id(), favori, true);
        flow.finishDeck("s1", host.id());
        assertThat(progressPayloads()).containsExactly(Map.of("done", 1L, "total", 2L));

        // Konumsuz katilimci desteyi "bitiremez" — bitirebilseydi done=2>=total=2 olur ve
        // Ayse hala kaydirirken karar YALNIZ host'un begenilerinden cikardi.
        assertThatThrownBy(() -> flow.finishDeck("s1", kerem.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("location");
        assertThatThrownBy(() -> flow.swipe("s1", kerem.id(), favori, true))
                .isInstanceOf(ConflictException.class);
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);

        flow.swipe("s1", ayse.id(), favori, true);
        flow.finishDeck("s1", ayse.id());

        assertThat(progressPayloads())
                .containsExactly(Map.of("done", 1L, "total", 2L), Map.of("done", 2L, "total", 2L));
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.DECIDED);
    }

    @Test
    void noLikesAtAllPublishesNoLikesEventAndKeepsSessionSwiping() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        flow.swipe("s1", host.id(), venues.get(0).id(), false);
        flow.swipe("s1", ayse.id(), venues.get(0).id(), false);

        flow.finishDeck("s1", host.id());
        flow.finishDeck("s1", ayse.id());

        assertThat(events.published).extracting(p -> p.event().type()).contains("no_likes");
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);
    }

    /** Etkilesimli yol (host force-decision): sessiz olay yerine 409 — host geri bildirim gorur. */
    @Test
    void forceDecisionWithNoLikesIsConflictInsteadOfEvent() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        flow.swipe("s1", host.id(), venues.get(0).id(), false);
        flow.finishDeck("s1", host.id());

        assertThatThrownBy(() -> flow.forceDecision("s1", host.id(), null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("no likes");
        assertThat(events.published).extracting(p -> p.event().type()).doesNotContain("no_likes");
    }

    @Test
    void emptyProviderResultRollsSessionBackToCollecting() {
        assertThatThrownBy(() -> flow.findVenues("s1", host.id()))
                .isInstanceOf(NoVenuesFoundException.class);

        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(requestedRadii).hasSize(4); // her genisletme denendi
        assertThat(events.published).isEmpty();
    }

    @Test
    void undoSwipeRemovesTheLikeFromTheDecision() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID v0 = venues.get(0).id();
        UUID v1 = venues.get(1).id();

        flow.swipe("s1", host.id(), v0, true);
        flow.swipe("s1", host.id(), v1, true);
        flow.undoSwipe("s1", host.id(), v0);
        flow.swipe("s1", ayse.id(), v0, true);
        flow.swipe("s1", ayse.id(), v1, true);
        flow.finishDeck("s1", host.id());
        flow.finishDeck("s1", ayse.id());

        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED); // geri alinmasaydi RUNOFF
        assertThat(decided.decidedVenueId()).isEqualTo(v1);
    }

    @Test
    void manualPointsCountForGeometryButNotForVoting() {
        Participant manual = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Kerem", new GeoPoint(51.48, 5.66), false, null, true, "Helmond", null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        List<Venue> venues = deck.venuesOf(session.id());
        UUID fav = venues.get(0).id();
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), fav, true);
            flow.finishDeck("s1", p.id());
        }
        // elle konum oy vermedigi halde "herkes bitirdi" sayildi → karar cikti
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(events.published).extracting(p -> p.event().type()).contains("deck_progress");
        assertThat(events.published.stream()
                .filter(p -> p.event().type().equals("deck_progress"))
                .map(p -> p.event().payload().get("total")).toList()).containsOnly(2L);
        assertThatThrownBy(() -> flow.swipe("s1", manual.id(), fav, true))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void unanimousDecisionRecordsKindAndTimestamp() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID fav = deck.venuesOf(session.id()).get(0).id();
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), fav, true);
            flow.finishDeck("s1", p.id());
        }
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decisionKind()).isEqualTo(DecisionKind.UNANIMOUS);
        assertThat(s.decidedAt()).isEqualTo(clock.instant());
    }

    @Test
    void runoffRecordsItsReasonAndTheWinningVoteIsKindRunoff() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1), cand(2, 4.0)));
        flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        List<Venue> venues = deck.venuesOf(session.id());
        // Ortak nokta yok → FALLBACK runoff
        flow.swipe("s1", host.id(), venues.get(0).id(), true);
        flow.swipe("s1", ayse.id(), venues.get(1).id(), true);
        flow.finishDeck("s1", host.id());
        flow.finishDeck("s1", ayse.id());

        Session inRunoff = store.sessionBySlug("s1").orElseThrow();
        assertThat(inRunoff.status()).isEqualTo(SessionStatus.RUNOFF);
        assertThat(inRunoff.runoffReason()).isEqualTo(RunoffReason.FALLBACK);
        assertThat(inRunoff.decisionKind()).isNull();

        UUID finalist = inRunoff.runoffVenueIds().get(0);
        flow.runoffVote("s1", host.id(), finalist);
        flow.runoffVote("s1", ayse.id(), finalist);

        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.decisionKind()).isEqualTo(DecisionKind.RUNOFF);
        assertThat(decided.runoffReason()).isEqualTo(RunoffReason.FALLBACK); // iz korunur
        assertThat(decided.decidedAt()).isEqualTo(clock.instant());
    }

    @Test
    void hostPickWhileBrowsingRecordsForcedKind() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.forceDecision("s1", host.id(), venues.get(0).id());
        assertThat(store.sessionBySlug("s1").orElseThrow().decisionKind())
                .isEqualTo(DecisionKind.FORCED);
    }

    @Test
    void forcedPartialEvaluationIsMarkedPartial() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());
        UUID fav = deck.venuesOf(session.id()).get(0).id();
        flow.swipe("s1", host.id(), fav, true);
        flow.finishDeck("s1", host.id());     // ayse bitirmedi
        flow.forceDecision("s1", host.id(), null);
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decisionKind()).isEqualTo(DecisionKind.PARTIAL);
    }

    @Test
    void findVenuesResolvesMidpointLabelOnceAndSurvivesGeocoderFailure() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        assertThat(store.sessionBySlug("s1").orElseThrow().midpointLabel()).isEqualTo("Eindhoven");
        assertThat(geocoder.calls).isEqualTo(1);

        flow.shuffle("s1", host.id());
        assertThat(geocoder.calls).isEqualTo(1); // etiket bir kez cozulur
    }

    @Test
    void midpointLabelStaysNullWhenGeocoderCannotResolve() {
        geocoder.label = null;
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", host.id());
        assertThat(store.sessionBySlug("s1").orElseThrow().midpointLabel()).isNull();
    }

    /**
     * Hayalet koltukla deste baslamaz: satir duruyor ama sahibi sayfayi kapatmis. Kapi PRESENCE'a
     * bakar, satir sayisina degil. Deste BITISI bilinçli olarak satira bakmaya devam eder —
     * geri alinamaz karar bir ag dalgalanmasina emanet edilemez.
     */
    @Test
    void shuffleNeedsTwoParticipantsActuallyPresent() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        flow.findVenues("s1", host.id());
        presence.left(session.id(), ayse.id(), "ws-ayse");

        assertThatThrownBy(() -> flow.shuffle("s1", host.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2 participants present");

        presence.arrived(session.id(), ayse.id(), "ws-ayse");
        flow.shuffle("s1", host.id());

        assertThat(store.sessions.get(session.id()).status()).isEqualTo(SessionStatus.SWIPING);
    }

    /** Capali destede 2 km'lik daire icinde mekanlar arasi yol farki TravelMinutes.STEP'in
        (5 dk) altinda kalir: fairnessFirst her mekani berabere gorup sirayi tohumlu karisima
        birakirdi. Sessizce dejenere olmasindansa acikca puan sirasi. */
    @Test
    void anchoredDeckIsOrderedByRating() {
        providerResult.addAll(List.of(cand(0, 4.2), cand(1, 4.8), cand(2, 3.9), cand(3, 4.5),
                cand(4, 4.1), cand(5, 4.6)));
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anch", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", new GeoPoint(51.6978, 5.3037), true, null, false,
                null, TravelMode.CAR, hostUser));

        List<Venue> venues = flow.findVenues(anchored.slug(), host.id());

        assertThat(venues).isNotEmpty();
        assertThat(venues).extracting(Venue::rating).isSortedAccordingTo(
                Comparator.nullsLast(Comparator.reverseOrder()));
    }

    /** Capali oturumda HIC konumlu katilimci olmasa da deste kurulur — onkosul duser. */
    @Test
    void anchoredSessionFindsVenuesWithoutAnyLocation() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anch0", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", null, true, null, false, null, TravelMode.CAR,
                hostUser));

        assertThat(flow.findVenues(anchored.slug(), host.id())).isNotEmpty();
    }

    /** Capasiz oturumda onkosul AYNEN durur. */
    @Test
    void unanchoredSessionStillNeedsTwoLocations() {
        Session plain = store.saveSession(new Session(UUID.randomUUID(), "plain", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), plain.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, null, false, null,
                TravelMode.CAR, hostUser));

        assertThatThrownBy(() -> flow.findVenues(plain.slug(), host.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("at least 2 participants");
    }

    /** Capali oturumda etiket olusturmada yazildi: find-venues onu EZMEZ ve gereksiz bir
        ters-geocode agi cagrisi yapmaz. */
    @Test
    void anchoredSessionKeepsCreationLabelAndSkipsGeocode() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anchlbl", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", null, true, null, false, null, TravelMode.CAR,
                hostUser));

        flow.findVenues(anchored.slug(), host.id());

        assertThat(store.sessionBySlug("anchlbl").orElseThrow().midpointLabel())
                .isEqualTo("Amsterdam");
        // geocoder gercek bir Mockito mock'u degil (FakeStores.FakeReverseGeocoder): cagri
        // sayaci verify(never()) ile ayni seyi soyler.
        assertThat(geocoder.calls).isZero();
    }

    /** Capali oturum kurar; katilimcilarin konumu YOKTUR (spec K1'in asil senaryosu). */
    private Session anchoredSession(String slug) {
        return store.saveSession(new Session(UUID.randomUUID(), slug, hostUser, null,
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
    }

    private Participant memberOf(Session s, String name, GeoPoint at, boolean host) {
        Participant p = store.saveParticipant(new Participant(UUID.randomUUID(), s.id(), name,
                at, host, null, false, null, TravelMode.CAR, host ? hostUser : null));
        presence.arrived(s.id(), p.id(), "ws-" + name);
        return p;
    }

    /** Capali oturumda konum uyeligin sarti DEGIL: konumsuz katilimci kaydirabilir (spec K1). */
    @Test
    void anchoredSessionLetsLocationlessParticipantSwipe() {
        Session anchored = anchoredSession("vote1");
        Participant h = memberOf(anchored, "Mehmet", null, true);
        Participant k = memberOf(anchored, "Kerem", null, false);
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));

        List<Venue> venues = flow.findVenues("vote1", h.id());
        flow.shuffle("vote1", h.id());
        flow.swipe("vote1", k.id(), venues.get(0).id(), true);

        assertThat(deck.likesByParticipant(anchored.id()).get(k.id()))
                .containsExactly(venues.get(0).id());
    }

    /** Capasiz oturumda kural AYNEN durur: orta nokta konumlardan turedigi icin konumsuz
        kisi orada temsil edilemez. */
    @Test
    void unanchoredSessionStillRequiresLocationToSwipe() {
        Participant kerem = store.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Kerem", null, false, null, false, null, TravelMode.CAR, null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", host.id());
        flow.shuffle("s1", host.id());

        assertThatThrownBy(() -> flow.swipe("s1", kerem.id(), venues.get(0).id(), true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("share your location");
    }

    /** shuffle'in "odada 2 oy veren" kapisi capalida konumdan bagimsiz doyar — kapinin
        kendisi degismedi, besledigi kume degisti (spec V6). */
    @Test
    void anchoredShuffleWorksWithoutAnyLocation() {
        Session anchored = anchoredSession("vote2");
        Participant h = memberOf(anchored, "Mehmet", null, true);
        memberOf(anchored, "Kerem", null, false);
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("vote2", h.id());

        flow.shuffle("vote2", h.id());

        assertThat(store.sessionBySlug("vote2").orElseThrow().status())
                .isEqualTo(SessionStatus.SWIPING);
    }

    /** Kabul edilen bedel (spec §5): karar artik konumsuz kisiyi de BEKLER. */
    @Test
    void anchoredDeckWaitsForTheLocationlessParticipant() {
        Session anchored = anchoredSession("vote3");
        Participant h = memberOf(anchored, "Mehmet", new GeoPoint(52.36, 4.90), true);
        Participant k = memberOf(anchored, "Kerem", null, false);
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("vote3", h.id());
        flow.shuffle("vote3", h.id());

        flow.swipe("vote3", h.id(), venues.get(0).id(), true);
        flow.finishDeck("vote3", h.id());
        // Konumsuz Kerem sayildigi icin karar HENUZ cikmaz.
        assertThat(store.sessionBySlug("vote3").orElseThrow().status())
                .isEqualTo(SessionStatus.SWIPING);

        flow.swipe("vote3", k.id(), venues.get(0).id(), true);
        flow.finishDeck("vote3", k.id());

        assertThat(store.sessionBySlug("vote3").orElseThrow().status())
                .isEqualTo(SessionStatus.DECIDED);
    }
}
