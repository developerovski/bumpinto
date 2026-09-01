package com.bumpinto.application;

import com.bumpinto.domain.deck.DecisionEngine;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.venue.VenueCandidate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
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
    List<Double> requestedRadii;
    List<VenueCandidate> providerResult;
    DeckFlow flow;
    UUID hostUser;
    Session session;
    Participant host;
    Participant ayse;

    static VenueCandidate cand(int i, double rating) {
        return new VenueCandidate("foursquare", "fsq-" + i, "Mekan " + i,
                new GeoPoint(51.5 + i * 0.001, 5.5), rating, 2, null, "https://maps/" + i);
    }

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        deck = new FakeStores.InMemoryDeckStore();
        events = new FakeStores.RecordingEvents();
        requestedRadii = new ArrayList<>();
        providerResult = new ArrayList<>();
        VenueProviderPort provider = (center, radiusKm, type, limit) -> {
            requestedRadii.add(radiusKm);
            return List.copyOf(providerResult);
        };
        flow = new DeckFlow(store, deck, provider, events, new DecisionEngine(),
                Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC));

        hostUser = UUID.randomUUID();
        session = store.saveSession(new Session(UUID.randomUUID(), "s1", hostUser, null,
                ActivityType.COFFEE, SessionStatus.COLLECTING,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of()));
        host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Mehmet", DEN_BOSCH, true, "tok-h", null));
        ayse = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Ayşe", SOMEREN, false, "tok-a", null));
    }

    @Test
    void findVenuesBuildsDeckSortedByRatingAndPublishes() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());

        List<Venue> venues = flow.findVenues("s1", hostUser);

        assertThat(venues).hasSize(8);
        assertThat(venues.get(0).name()).isEqualTo("Mekan 7"); // en yüksek rating önce
        assertThat(venues.get(0).deckOrder()).isZero();
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);
        assertThat(events.published).extracting(p -> p.event().type()).containsExactly("deck_ready");
        assertThat(requestedRadii).hasSize(1);
    }

    @Test
    void findVenuesExpandsRadiusWhenSparseAndAcceptsSmallDeck() {
        providerResult.addAll(List.of(cand(0, 4.0), cand(1, 4.2), cand(2, 4.4))); // hep 3 sonuç

        List<Venue> venues = flow.findVenues("s1", hostUser);

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
        store.saveSession(new Session(session.id(), "s1", hostUser, null, ActivityType.COFFEE,
                SessionStatus.COLLECTING, Instant.parse("2026-09-01T09:59:59Z"), null, List.of()));

        assertThatThrownBy(() -> flow.findVenues("s1", hostUser))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("EXPIRED");
    }

    @Test
    void fullSwipeFlowAutoDecidesWhenEveryoneFinishes() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
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
        List<Venue> venues = flow.findVenues("s1", hostUser);
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
        flow.runoffVote("s1", ayse.id(), v1); // beraberlik
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.RUNOFF);

        flow.forceDecision("s1", hostUser, v0);
        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(decided.decidedVenueId()).isEqualTo(v0);
    }

    /** deck_progress payload'inin DEGERLERI: konumsuz katilimci ne done'a ne total'e girer. */
    List<Map<String, Object>> progressPayloads() {
        return events.published.stream().map(FakeStores.Published::event)
                .filter(e -> e.type().equals("deck_progress")).map(SessionEvent::payload).toList();
    }

    @Test
    void participantWithoutLocationNeitherCountsNorFinishesTheDeck() {
        Participant kerem = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Kerem", null, false, "tok-k", null));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
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
        List<Venue> venues = flow.findVenues("s1", hostUser);
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
        List<Venue> venues = flow.findVenues("s1", hostUser);
        flow.swipe("s1", host.id(), venues.get(0).id(), false);
        flow.finishDeck("s1", host.id());

        assertThatThrownBy(() -> flow.forceDecision("s1", hostUser, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("no likes");
        assertThat(events.published).extracting(p -> p.event().type()).doesNotContain("no_likes");
    }

    @Test
    void emptyProviderResultRollsSessionBackToCollecting() {
        assertThatThrownBy(() -> flow.findVenues("s1", hostUser))
                .isInstanceOf(NoVenuesFoundException.class);

        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(requestedRadii).hasSize(4); // her genisletme denendi
        assertThat(events.published).isEmpty();
    }

    @Test
    void undoSwipeRemovesTheLikeFromTheDecision() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
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
}
