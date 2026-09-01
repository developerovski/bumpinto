package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
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
                "Cuma", ActivityType.COFFEE, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Participant host = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, "tok-h", null));

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

    private Session newSession(String slug) {
        UUID host = users.upsertByEmail(slug + "@x.dev", "Host " + slug);
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Cuma",
                ActivityType.COFFEE, SessionStatus.COLLECTING, Instant.now().plusSeconds(600),
                null, List.of()));
    }

    private Participant join(Session s, String name, String token, boolean host) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(), name,
                new GeoPoint(51.6978, 5.3037), host, token, null));
    }

    private Venue venue(Session s, String externalId, int order) {
        return new Venue(UUID.randomUUID(), s.id(), "foursquare", externalId, "Café " + externalId,
                new GeoPoint(51.44, 5.47), 4.6, 2, "https://photo", "https://maps", order);
    }
}
