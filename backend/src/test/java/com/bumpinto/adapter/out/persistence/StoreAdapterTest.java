package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({SessionStoreAdapter.class, DeckStoreAdapter.class, UserStoreAdapter.class})
class StoreAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;
    @Autowired UserRepository userRows;

    @Test
    void fullRoundTripThroughPorts() {
        UUID hostUser = users.upsertByEmail("m@x.dev", "Mehmet");
        assertThat(users.upsertByEmail("m@x.dev", "Mehmet")).isEqualTo(hostUser); // idempotent
        assertThat(users.upsertByEmail("m@x.dev", "Mehmet Y")).isEqualTo(hostUser);
        assertThat(userRows.findByEmail("m@x.dev").orElseThrow().name).isEqualTo("Mehmet Y");

        Session s = sessions.saveSession(new Session(UUID.randomUUID(), "slugtest", hostUser,
                "Cuma", ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Participant host = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, "tok-h", null, false, null));

        Session read = sessions.sessionBySlug("slugtest").orElseThrow();
        assertThat(read).isEqualTo(s);
        Participant readHost = sessions.participantByToken("tok-h").orElseThrow();
        assertThat(readHost).isEqualTo(host);

        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "fsq1", "Café Berlage",
                new GeoPoint(51.44, 5.47), 4.6, 2, "https://photo", "https://maps", 0);
        deck.saveVenues(List.of(v));
        assertThat(deck.venuesOf(s.id())).containsExactly(v); // tüm kolonlar geri okunur

        deck.saveSwipe(s.id(), v.id(), host.id(), true);
        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(s.id());
        assertThat(likes.get(host.id())).containsExactly(v.id());

        deck.castVote(s.id(), v.id(), host.id());
        assertThat(deck.voteTally(s.id())).containsEntry(v.id(), 1L);
        assertThat(deck.votersCount(s.id())).isEqualTo(1);

        Session runoff = sessions.saveSession(s.inRunoff(List.of(v.id())));
        assertThat(sessions.sessionBySlug("slugtest").orElseThrow().runoffVenueIds())
                .containsExactly(v.id());
        assertThat(runoff.status()).isEqualTo(SessionStatus.RUNOFF);
    }

    /**
     * Sözleşme sabitlemesi: sadece dislike atmış katılımcı haritada BOŞ SET ile yer alır
     * (anahtar düşmez). Karar motoru "hiç swipe atmamış" ile "hepsini beğenmemiş" arasında
     * bu farkı görür.
     */
    @Test
    void likesByParticipantKeepsDislikeOnlyParticipantWithEmptySet() {
        Session s = newSession("dislk");
        Participant liker = join(s, "Liker", "tok-liker", true);
        Participant disliker = join(s, "Disliker", "tok-disliker", false);
        Participant silent = join(s, "Silent", "tok-silent", false);
        Venue v = venue(s, "fsq-a", 0);
        deck.saveVenues(List.of(v));

        deck.saveSwipe(s.id(), v.id(), liker.id(), true);
        deck.saveSwipe(s.id(), v.id(), disliker.id(), false);

        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(s.id());
        assertThat(likes).containsOnlyKeys(liker.id(), disliker.id());
        assertThat(likes.get(disliker.id())).isEmpty();
        assertThat(likes).doesNotContainKey(silent.id());
    }

    @Test
    void queriesAreScopedToSession() {
        Session a = newSession("scopa");
        Session b = newSession("scopb");
        Participant pa = join(a, "A", "tok-a", true);
        Participant pb = join(b, "B", "tok-b", true);
        Venue va = venue(a, "fsq-a", 0);
        Venue vb = venue(b, "fsq-b", 0);
        deck.saveVenues(List.of(va, vb));

        deck.saveSwipe(a.id(), va.id(), pa.id(), true);
        deck.saveSwipe(b.id(), vb.id(), pb.id(), true);
        deck.castVote(a.id(), va.id(), pa.id());
        deck.castVote(b.id(), vb.id(), pb.id());

        assertThat(deck.venuesOf(a.id())).extracting(Venue::id).containsExactly(va.id());
        assertThat(deck.likesByParticipant(a.id())).containsOnlyKeys(pa.id());
        assertThat(deck.voteTally(a.id())).containsOnly(entry(va.id(), 1L));
        assertThat(deck.votersCount(a.id())).isEqualTo(1);
        assertThat(sessions.participantsOf(a.id())).extracting(Participant::id)
                .containsExactly(pa.id());
    }

    @Test
    void reorderVenuesSwapsOrderWithoutViolatingUniqueIndex() {
        Session s = newSession("reordr");
        Venue v0 = venue(s, "fsq-0", 0);
        Venue v1 = venue(s, "fsq-1", 1);
        Venue v2 = venue(s, "fsq-2", 2);
        deck.saveVenues(List.of(v0, v1, v2));
        List<Venue> before = deck.venuesOf(s.id());
        List<UUID> reversed = new ArrayList<>(before.stream().map(Venue::id).toList());
        Collections.reverse(reversed);

        deck.reorderVenues(s.id(), reversed);

        assertThat(deck.venuesOf(s.id()).stream().map(Venue::id).toList()).isEqualTo(reversed);
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2);
    }

    @Test
    void compositeKeysScopeSwipeDeleteAndVoteReplace() {
        Session s = newSession("compk");
        Participant p1 = join(s, "P1", "tok-p1", true);
        Participant p2 = join(s, "P2", "tok-p2", false);
        Venue v1 = venue(s, "fsq-1", 0);
        Venue v2 = venue(s, "fsq-2", 1);
        deck.saveVenues(List.of(v1, v2));

        deck.saveSwipe(s.id(), v1.id(), p1.id(), true);
        deck.saveSwipe(s.id(), v2.id(), p1.id(), true);
        deck.saveSwipe(s.id(), v1.id(), p2.id(), true);
        deck.deleteSwipe(v1.id(), p1.id()); // swipe PK (venue, participant): sadece bu satır gider

        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(s.id());
        assertThat(likes.get(p1.id())).containsExactly(v2.id());
        assertThat(likes.get(p2.id())).containsExactly(v1.id());

        deck.castVote(s.id(), v1.id(), p1.id());
        deck.castVote(s.id(), v2.id(), p1.id()); // vote PK (session, participant): oy değişir
        deck.castVote(s.id(), v1.id(), p2.id());

        assertThat(deck.voteTally(s.id())).containsOnly(entry(v1.id(), 1L), entry(v2.id(), 1L));
        assertThat(deck.votersCount(s.id())).isEqualTo(2);
    }

    /**
     * Eşzamanlı iki login aynı e-postayla gelirse ikisi de findByEmail'i ıskalar ve
     * ikinci INSERT unique(email)'e çarpar. Adapter çakışmayı yutup kazananın satırını okur.
     */
    @Test
    void upsertByEmailRecoversFromConcurrentInsert() {
        UUID winner = UUID.randomUUID();
        UserRepository racing = mock(UserRepository.class);
        when(racing.findByEmail("race@x.dev"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(UserEntity.of(winner, "race@x.dev", "Ayşe", "google")));
        when(racing.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate key: users_email_key"));

        assertThat(new UserStoreAdapter(racing).upsertByEmail("race@x.dev", "Ayşe"))
                .isEqualTo(winner);
    }

    @Test
    void userProfileRoundTripsPreferences() {
        UUID id = users.upsertByEmail("pref@bumpinto.test", "Mehmet");
        UserProfile before = users.profileOf(id).orElseThrow();
        assertThat(before.language()).isNull();
        users.saveProfile(before.withPreferences("Mehmet Ş.", new GeoPoint(51.6978, 5.3037),
                "'s-Hertogenbosch", ActivityType.COFFEE, "tr"));
        UserProfile after = users.profileOf(id).orElseThrow();
        assertThat(after.name()).isEqualTo("Mehmet Ş.");
        assertThat(after.defaultLocation()).isEqualTo(new GeoPoint(51.6978, 5.3037));
        assertThat(after.defaultLocationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(after.defaultActivity()).isEqualTo(ActivityType.COFFEE);
        assertThat(after.language()).isEqualTo("tr");
    }

    /**
     * created_at aynı transaction içindeki tüm INSERT'lerde now()'dan sabittir (Postgres
     * transaction timestamp'i) — sıralama id DESC tie-break'e düşer; bu yüzden ikinci oturuma
     * kasten daha büyük bir id veriyoruz.
     */
    @Test
    void hostSummariesCountParticipantsAndGuests() {
        UUID hostA = users.upsertByEmail("summary-host@bumpinto.test", "Ayla");

        Session session1 = sessions.saveSession(new Session(
                UUID.fromString("11111111-1111-1111-1111-111111111111"), "smryssn1", hostA, "Cuma",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Session session2 = sessions.saveSession(new Session(
                UUID.fromString("22222222-2222-2222-2222-222222222222"), "smryssn2", hostA,
                "Cumartesi", ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));

        sessions.saveParticipant(new Participant(UUID.randomUUID(), session1.id(), "Ayla",
                new GeoPoint(51.6978, 5.3037), true, "tok-s1-host", null, false, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session1.id(), "Ayşe",
                new GeoPoint(51.7, 5.3), false, "tok-s1-ayse", Instant.now(), false, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session1.id(), "Kerem",
                null, false, "tok-s1-kerem", null, false, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session1.id(), "Nokta",
                new GeoPoint(51.71, 5.31), false, null, null, true, "Manuel nokta"));

        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Ayla",
                new GeoPoint(51.6978, 5.3037), true, "tok-s2-host", null, false, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Zeynep",
                new GeoPoint(51.72, 5.32), false, "tok-s2-zeynep", Instant.now(), false, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Mert",
                new GeoPoint(51.73, 5.33), false, "tok-s2-mert", null, false, null));

        Venue decidedVenue = venue(session2, "smry-venue", 0);
        deck.saveVenues(List.of(decidedVenue));
        sessions.saveSession(session2.decided(decidedVenue.id()));

        List<SessionSummary> summaries = sessions.summariesOfHost(hostA, 10);
        assertThat(summaries).extracting(s -> s.session().id())
                .containsExactly(session2.id(), session1.id());

        SessionSummary newest = summaries.get(0);
        assertThat(newest.participantCount()).isEqualTo(3);
        assertThat(newest.readyCount()).isEqualTo(3);
        assertThat(newest.doneCount()).isEqualTo(1);
        assertThat(newest.decidedVenueName()).isEqualTo(decidedVenue.name());
        assertThat(newest.decidedVenuePhotoUrl()).isEqualTo(decidedVenue.photoUrl());

        SessionSummary older = summaries.get(1);
        assertThat(older.participantCount()).isEqualTo(4);
        assertThat(older.readyCount()).isEqualTo(3);
        assertThat(older.doneCount()).isEqualTo(1);
        assertThat(older.decidedVenueName()).isNull();
        assertThat(older.decidedVenuePhotoUrl()).isNull();

        assertThat(sessions.summariesOfHost(hostA, 1)).hasSize(1);
        assertThat(sessions.hostedSessionCount(hostA)).isEqualTo(2);
        assertThat(sessions.distinctGuestsOfHost(hostA)).isEqualTo(4); // Ayşe, Kerem, Zeynep, Mert
    }

    private Session newSession(String slug) {
        UUID host = users.upsertByEmail(slug + "@x.dev", "Host " + slug);
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Cuma",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
    }

    private Participant join(Session s, String name, String token, boolean host) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(), name,
                new GeoPoint(51.6978, 5.3037), host, token, null, false, null));
    }

    private Venue venue(Session s, String externalId, int order) {
        return new Venue(UUID.randomUUID(), s.id(), "foursquare", externalId, "Café " + externalId,
                new GeoPoint(51.44, 5.47), 4.6, 2, "https://photo", "https://maps", order);
    }
}
