package com.bumpinto.application.session;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Okuma tarafı da tembel expiry uygular — aksi halde süresi dolmuş oturum GET'te COLLECTING görünür. */
class SessionQueriesTest {

    static final Instant NOW = Instant.parse("2026-09-01T12:00:00Z");

    final FakeStores.InMemorySessionStore sessions = new FakeStores.InMemorySessionStore();
    final FakeStores.InMemoryDeckStore deck = new FakeStores.InMemoryDeckStore();
    final SessionQueries queries =
            new SessionQueries(sessions, deck, Clock.fixed(NOW, ZoneOffset.UTC));

    Session stored(SessionStatus status, Instant expiresAt) {
        Session session = new Session(UUID.randomUUID(), "x7k2m", UUID.randomUUID(), "Kahve",
                ActivityType.COFFEE, SessionType.GROUP, status, expiresAt, null, List.of());
        return sessions.saveSession(session);
    }

    Participant participantIn(Session session, boolean host) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                host ? "Mehmet" : "Ayşe", new GeoPoint(51.7, 5.3), host, null, false, null, null,
                host ? session.hostId() : null));
    }

    void venueIn(Session session) {
        deck.saveVenues(List.of(new Venue(UUID.randomUUID(), session.id(), "fsq", "e1", "Kafe",
                new GeoPoint(51.7, 5.3), 4.5, 2, null, null, 0)));
    }

    Session session;
    Participant host;
    Participant ayse;
    /** Elle konum: votes()=false, deckDoneAt=null — "herkes bitirdi/oy verdi" sayimina HIC girmez. */
    Participant nonFinisher;
    UUID finalistA;
    UUID finalistB;
    UUID likedVenueId;

    Participant manualPointIn(Session session) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), session.id(), "Kerem",
                new GeoPoint(51.48, 5.66), false, null, true, "Helmond", null));
    }

    /**
     * RUNOFF'ta iki finalist, deste'yi bitirmis iki katilimci (henuz oy yok) VE bitirmemis/oy
     * vermeyen bir elle konum — sayim kapisinin gercekten `finishers`i (deckDone && votes)
     * filtreledigini, toplam katilimci sayisini kullanmadigini kanitlar (2 finisher, 3 katilimci).
     */
    void seedRunoffWithTwoFinishers() {
        session = stored(SessionStatus.RUNOFF, NOW.plusSeconds(3600));
        finalistA = UUID.randomUUID();
        finalistB = UUID.randomUUID();
        session = sessions.saveSession(session.inRunoff(List.of(finalistA, finalistB),
                RunoffReason.FALLBACK));
        host = sessions.saveParticipant(participantIn(session, true).doneAt(NOW));
        ayse = sessions.saveParticipant(participantIn(session, false).doneAt(NOW));
        nonFinisher = manualPointIn(session);
    }

    /**
     * SWIPING'te bir mekani iki katilimci da begenmis, ikisi de desteyi bitirmis; ayrica
     * desteyi bitirmemis/oy popülasyonu disi bir elle konum AYNI mekani begenmis — likeCounts
     * bu begeniyi saymamali (yalniz finishers sayilir).
     */
    void seedSwipingWithLikes() {
        session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        host = sessions.saveParticipant(participantIn(session, true).doneAt(NOW));
        ayse = sessions.saveParticipant(participantIn(session, false).doneAt(NOW));
        nonFinisher = manualPointIn(session);
        Venue venue = new Venue(UUID.randomUUID(), session.id(), "fsq", "e1", "Kafe",
                new GeoPoint(51.7, 5.3), 4.5, 2, null, null, 0);
        deck.saveVenues(List.of(venue));
        likedVenueId = venue.id();
        deck.saveSwipe(session.id(), likedVenueId, host.id(), true);
        deck.saveSwipe(session.id(), likedVenueId, ayse.id(), true);
        deck.saveSwipe(session.id(), likedVenueId, nonFinisher.id(), true);
    }

    @Test
    void liveSessionKeepsItsStatusAndShowsTheDeck() {
        Session session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        venueIn(session);

        SessionQueries.SessionSnapshot snap = queries.snapshot("x7k2m");

        assertThat(snap.session().status()).isEqualTo(SessionStatus.SWIPING);
        assertThat(snap.venues()).hasSize(1);
    }

    @Test
    void expiredSessionIsReportedExpiredWithoutWritingToTheStore() {
        Session session = stored(SessionStatus.SWIPING, NOW.minusSeconds(1));
        venueIn(session);

        SessionQueries.SessionSnapshot snap = queries.snapshot("x7k2m");

        assertThat(snap.session().status()).isEqualTo(SessionStatus.EXPIRED);
        assertThat(snap.venues()).isEmpty(); // kapalı oturumda deste gösterilmez
        assertThat(sessions.sessions.get(session.id()).status())
                .isEqualTo(SessionStatus.SWIPING); // GET'in yan etkisi yok
    }

    /** Sınır katı: expiresAt anının kendisi henüz dolmuş sayılmaz (komut tarafıyla aynı kural). */
    @Test
    void expiryBoundaryIsStrict() {
        stored(SessionStatus.COLLECTING, NOW);

        assertThat(queries.snapshot("x7k2m").session().status())
                .isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void unknownSlugIsNotFound() {
        assertThatThrownBy(() -> queries.snapshot("nope"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("session not found");
    }

    /**
     * Host da bir katilimcidir. Katilimci token'i yalniz oturum kurulurken BIR KEZ cereze
     * yazilir; host oturumu baska bir tarayicida/cihazda actiginda elinde sadece hesap
     * JWT'si olur. Kimligi oradan cozemezsek deste yazmalari 403 doner.
     */
    @Test
    void hostParticipantIsResolvedFromTheAccountThatOwnsTheSession() {
        Session session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        UUID hostParticipant = participantIn(session, true).id();
        participantIn(session, false);

        assertThat(queries.participantIdOf("x7k2m", session.hostId()))
                .contains(hostParticipant);
    }

    /** Baska bir kullanicinin JWT'si host kimligini ACMAZ — yoksa herkes host adina kaydirirdi. */
    @Test
    void anotherAccountDoesNotResolveToTheHostParticipant() {
        Session session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        participantIn(session, true);

        assertThat(queries.participantIdOf("x7k2m", UUID.randomUUID())).isEmpty();
        assertThat(queries.participantIdOf("yok", session.hostId())).isEmpty();
    }

    /**
     * Host'a ozel bir dal DEGIL: koltugu olan davetli uye de katilimci cerezi olmayan bir
     * tarayicida kendi kimligini geri bulur — yoksa ikinci bir koltukla girerdi.
     */
    @Test
    void aSignedInGuestAlsoResolvesToItsOwnSeat() {
        Session session = stored(SessionStatus.SWIPING, NOW.plusSeconds(3600));
        participantIn(session, true);
        UUID guestAccount = UUID.randomUUID();
        Participant guest = sessions.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Ayşe", new GeoPoint(51.4, 5.4), false, null, false, null, null,
                guestAccount));

        assertThat(queries.participantIdOf("x7k2m", guestAccount)).contains(guest.id());
    }

    @Test
    void voteTallyIsHiddenUntilEveryFinisherHasVoted() {
        // 3 katilimci, yalniz 2'si finisher (3.'su elle konum: deckDone=false, votes()=false) —
        // kapi TOPLAM katilimciyi degil dogru finishers sayisini kullanmali, yoksa asla acilmaz.
        seedRunoffWithTwoFinishers();
        deck.castVote(session.id(), finalistA, host.id());
        assertThat(queries.snapshot("x7k2m").voteTally()).isEmpty();

        // Iki finisher de oy verdi (nonFinisher hic oy vermedi, vermesi de beklenmiyor) →
        // sayim acilir: kapi 2/2 finisher'a bakiyor, 2/3 toplam katilimciya degil.
        deck.castVote(session.id(), finalistA, ayse.id());
        assertThat(queries.snapshot("x7k2m").voteTally()).isNotEmpty();
    }

    @Test
    void likeCountsAppearOnlyAfterDecisionAndExcludeNonFinishers() {
        seedSwipingWithLikes();
        assertThat(queries.snapshot("x7k2m").likeCounts()).isEmpty();
        sessions.saveSession(sessions.sessionBySlug("x7k2m").orElseThrow()
                .decided(likedVenueId, DecisionKind.UNANIMOUS, Instant.parse("2026-09-03T18:00:00Z")));
        // 3 swipe kaydedildi (host, ayse, nonFinisher) ama sayim 2: elle konumun begenisi
        // desteyi bitirmedigi/oy popülasyonu disi oldugu icin likeCounts'a hic girmez.
        assertThat(queries.snapshot("x7k2m").likeCounts()).containsEntry(likedVenueId, 2L);
    }
}
