package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.user.AuthProvider;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.domain.venue.TaglineSource;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({SessionStoreAdapter.class, DeckStoreAdapter.class, UserStoreAdapter.class,
        ReportStoreAdapter.class, BlockStoreAdapter.class, AppConfig.class})
class StoreAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;
    @Autowired UserRepository userRows;
    @Autowired BlockStorePort blocks;

    private static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    @Test
    void appleSubIsThePrimaryMatcherAndEmailTheSecondary() {
        UUID google = users.upsertByEmail("ayse@bumpinto.test", "Ayse");
        UUID merged = users.upsertByAppleSub("apple-sub-1", "ayse@bumpinto.test", "Ayse");
        assertThat(merged).isEqualTo(google);
        assertThat(users.profileOf(merged).orElseThrow().authProviders())
                .containsExactlyInAnyOrder(AuthProvider.GOOGLE, AuthProvider.APPLE);
        // Private-relay e-postasiyla ikinci giris: e-posta TUTMAZ, sub tutar -> ayni hesap.
        assertThat(users.upsertByAppleSub("apple-sub-1", "xyz@privaterelay.appleid.com", "Ayse"))
                .isEqualTo(google);
    }

    @Test
    void softDeleteReleasesTheIdentityAndHidesTheProfile() {
        UUID id = users.upsertByAppleSub("apple-sub-2", "mehmet@bumpinto.test", "Mehmet");
        users.saveAppleRefreshToken(id, "rt-1");
        assertThat(users.appleRefreshToken(id)).contains("rt-1");
        users.softDelete(id, T0, T0.plus(Duration.ofDays(30)));
        assertThat(users.profileOf(id)).isEmpty();
        // Kimlik serbest: ayni e-posta yeni bir hesap acabilir.
        assertThat(users.upsertByEmail("mehmet@bumpinto.test", "Mehmet")).isNotEqualTo(id);
    }

    @Test
    void blocksAreReadableFromBothEndsAndOnlyTheOwnerCanDeleteThem() {
        UUID me = users.upsertByEmail("me@bumpinto.test", "Ben");
        UUID other = users.upsertByEmail("other@bumpinto.test", "O");
        UUID blockId = blocks.save(Block.ofUser(UUID.randomUUID(), me, other, T0)).id();
        assertThat(blocks.blockedUserIdsOf(me)).containsExactly(other);
        assertThat(blocks.blockerUserIdsOf(other)).containsExactly(me);
        assertThat(blocks.delete(other, blockId)).isFalse();
        assertThat(blocks.delete(me, blockId)).isTrue();
        assertThat(blocks.listingsOf(me)).isEmpty();
    }

    @Test
    void fullRoundTripThroughPorts() {
        UUID hostUser = users.upsertByEmail("m@x.dev", "Mehmet");
        assertThat(users.upsertByEmail("m@x.dev", "Mehmet")).isEqualTo(hostUser); // idempotent
        assertThat(users.upsertByEmail("m@x.dev", "Mehmet Y")).isEqualTo(hostUser);
        assertThat(userRows.findByEmail("m@x.dev").orElseThrow().name).isEqualTo("Mehmet Y");

        Session s = sessions.saveSession(new Session(UUID.randomUUID(), "slugtest", hostUser,
                "Cuma", List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Participant host = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, null, false, null, null));

        Session read = sessions.sessionBySlug("slugtest").orElseThrow();
        assertThat(read).isEqualTo(s);
        Participant readHost = participantNamed(s.id(), "Mehmet");
        assertThat(readHost).isEqualTo(host);

        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "fsq1", "Café Berlage",
                new GeoPoint(51.44, 5.47), 4.6, 2, "https://photo", 0);
        deck.saveVenues(List.of(v));
        assertThat(deck.venuesOf(s.id())).containsExactly(v); // tüm kolonlar geri okunur

        deck.saveSwipe(s.id(), v.id(), host.id(), true);
        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(s.id());
        assertThat(likes.get(host.id())).containsExactly(v.id());

        deck.castVote(s.id(), v.id(), host.id());
        // containsOnly: "fazladan oy satiri yok" kapsami votersCount'tan buraya tasindi.
        assertThat(deck.voteTally(s.id())).containsOnly(entry(v.id(), 1L));

        Session runoff = sessions.saveSession(s.inRunoff(List.of(v.id()), RunoffReason.FALLBACK));
        assertThat(sessions.sessionBySlug("slugtest").orElseThrow().runoffVenueIds())
                .containsExactly(v.id());
        assertThat(runoff.status()).isEqualTo(SessionStatus.RUNOFF);
    }

    @Test
    void travelModeRoundTripsThroughParticipant() {
        Session s = newSession("travelm");
        Participant biker = join(s, "Biker", false, TravelMode.BIKE);
        Participant defaulted = join(s, "Defaulted", false);

        assertThat(participantNamed(s.id(), "Biker").travelMode()).isEqualTo(TravelMode.BIKE);
        assertThat(participantNamed(s.id(), "Defaulted").travelMode()).isEqualTo(TravelMode.CAR);
    }

    @Test
    void decisionMetadataRoundTrips() {
        Session s = newSession("meta");
        Venue v = venue(s, "meta-venue", 0);
        deck.saveVenues(List.of(v));
        UUID venueId = v.id();
        Instant when = Instant.parse("2026-09-03T18:20:00Z");
        sessions.saveSession(s.withMidpointLabel("Eindhoven")
                .decided(venueId, DecisionKind.RUNOFF, when));

        Session back = sessions.sessionBySlug("meta").orElseThrow();
        assertThat(back.decidedAt()).isEqualTo(when);
        assertThat(back.decisionKind()).isEqualTo(DecisionKind.RUNOFF);
        assertThat(back.midpointLabel()).isEqualTo("Eindhoven");
        assertThat(back.runoffReason()).isNull();

        sessions.saveSession(back.inRunoff(List.of(venueId), RunoffReason.FALLBACK));
        assertThat(sessions.sessionBySlug("meta").orElseThrow().runoffReason())
                .isEqualTo(RunoffReason.FALLBACK);
    }

    /**
     * Sözleşme sabitlemesi: sadece dislike atmış katılımcı haritada BOŞ SET ile yer alır
     * (anahtar düşmez). Karar motoru "hiç swipe atmamış" ile "hepsini beğenmemiş" arasında
     * bu farkı görür.
     */
    @Test
    void likesByParticipantKeepsDislikeOnlyParticipantWithEmptySet() {
        Session s = newSession("dislk");
        Participant liker = join(s, "Liker", true);
        Participant disliker = join(s, "Disliker", false);
        Participant silent = join(s, "Silent", false);
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
        Participant pa = join(a, "A", true);
        Participant pb = join(b, "B", true);
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
        Participant p1 = join(s, "P1", true);
        Participant p2 = join(s, "P2", false);
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
                .thenReturn(Optional.of(UserEntity.of(winner, "race@x.dev", "Ayşe", AuthProvider.GOOGLE)));
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
        assertThat(before.defaultTravelMode()).isNull();
        users.saveProfile(before.withPreferences("Mehmet Ş.", new GeoPoint(51.6978, 5.3037),
                "'s-Hertogenbosch", ActivityType.COFFEE, "tr", TravelMode.EBIKE));
        UserProfile after = users.profileOf(id).orElseThrow();
        assertThat(after.name()).isEqualTo("Mehmet Ş.");
        assertThat(after.defaultLocation()).isEqualTo(new GeoPoint(51.6978, 5.3037));
        assertThat(after.defaultLocationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(after.defaultActivity()).isEqualTo(ActivityType.COFFEE);
        assertThat(after.language()).isEqualTo("tr");
        assertThat(after.defaultTravelMode()).isEqualTo(TravelMode.EBIKE);
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
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Session session2 = sessions.saveSession(new Session(
                UUID.fromString("22222222-2222-2222-2222-222222222222"), "smryssn2", hostA,
                "Cumartesi", List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));

        // joined_at ayni transaction'da SABIT; siralama id ASC tie-break'ine duser, bu yuzden
        // koltuk id'leri kasten artan verilir: beklenen sira Ayla, Ayşe, Kerem, Nokta.
        sessions.saveParticipant(new Participant(
                UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001"), session1.id(), "Ayla",
                new GeoPoint(51.6978, 5.3037), true, null, false, null, null));
        sessions.saveParticipant(new Participant(
                UUID.fromString("aaaaaaaa-0000-0000-0000-000000000002"), session1.id(), "Ayşe",
                new GeoPoint(51.7, 5.3), false, Instant.now(), false, null, null));
        sessions.saveParticipant(new Participant(
                UUID.fromString("aaaaaaaa-0000-0000-0000-000000000003"), session1.id(), "Kerem",
                null, false, null, false, null, null));
        sessions.saveParticipant(new Participant(
                UUID.fromString("aaaaaaaa-0000-0000-0000-000000000004"), session1.id(), "Nokta",
                new GeoPoint(51.71, 5.31), false, null, true, "Manuel nokta", null));

        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Ayla",
                new GeoPoint(51.6978, 5.3037), true, null, false, null, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Zeynep",
                new GeoPoint(51.72, 5.32), false, Instant.now(), false, null, null));
        sessions.saveParticipant(new Participant(UUID.randomUUID(), session2.id(), "Mert",
                new GeoPoint(51.73, 5.33), false, null, false, null, null));

        Venue decidedVenue = venue(session2, "smry-venue", 0);
        deck.saveVenues(List.of(decidedVenue));
        sessions.saveSession(session2.decided(decidedVenue.id(), DecisionKind.UNANIMOUS, Instant.now()));

        Instant now = Instant.now();
        // session2 karar verildi -> gecmis; session1 hala acik.
        List<SessionSummary> past = sessions.pastSummariesOfHost(hostA, now, 10);
        List<SessionSummary> open = sessions.openSummariesOfHost(hostA, now);
        assertThat(past).extracting(s -> s.session().id()).containsExactly(session2.id());
        assertThat(open).extracting(s -> s.session().id()).containsExactly(session1.id());

        SessionSummary newest = past.get(0);
        assertThat(newest.participantCount()).isEqualTo(3);
        assertThat(newest.readyCount()).isEqualTo(3);
        assertThat(newest.doneCount()).isEqualTo(1);
        assertThat(newest.decidedVenueName()).isEqualTo(decidedVenue.name());
        assertThat(newest.decidedVenuePhotoUrl()).isEqualTo(decidedVenue.photoUrl());

        SessionSummary older = open.get(0);
        assertThat(older.participantCount()).isEqualTo(4);
        assertThat(older.readyCount()).isEqualTo(3);
        assertThat(older.doneCount()).isEqualTo(1);
        assertThat(older.decidedVenueName()).isNull();
        assertThat(older.decidedVenuePhotoUrl()).isNull();
        // Avatar yigini: sayimlarla AYNI satirlardan, katilma sirasinda (host once). Kerem'in
        // konumu yok -> ready=false; elle eklenen nokta da sayimlarda oldugu gibi yiginde.
        assertThat(older.participants())
                .extracting(SessionSummary.ParticipantSummary::displayName,
                        SessionSummary.ParticipantSummary::ready,
                        SessionSummary.ParticipantSummary::host)
                .containsExactly(tuple("Ayla", true, true), tuple("Ayşe", true, false),
                        tuple("Kerem", false, false), tuple("Nokta", true, false));
        assertThat(newest.participants())
                .extracting(SessionSummary.ParticipantSummary::displayName)
                .containsExactlyInAnyOrder("Ayla", "Zeynep", "Mert");

        assertThat(sessions.hostedSessionCount(hostA)).isEqualTo(2);
        assertThat(sessions.distinctGuestsOfHost(hostA)).isEqualTo(4); // Ayşe, Kerem, Zeynep, Mert
    }

    /**
     * Bolme SQL'de, tembel expiry ile AYNI kurala gore: TTL'i gecmis satirin KAYITLI statusu
     * hala COLLECTING olabilir (SessionExpiry hicbir sey yazmaz) ve o satir gecmise aittir.
     * Tavan da yalniz gecmise uygulanir; acik kutu limitsizdir.
     */
    @Test
    void hostSummariesSplitByLazyExpiryRuleAndCapOnlyThePast() {
        UUID host = users.upsertByEmail("split-host@bumpinto.test", "Bolen");
        Instant now = Instant.parse("2026-09-07T12:00:00Z");

        // created_at transaction icinde SABIT -> siralama id DESC'e duser; id'ler kasten artan.
        Session live = hostedSession(host, "splt001", "11111111-0000-0000-0000-000000000001",
                SessionStatus.COLLECTING, now.plusSeconds(600));
        Session timedOut = hostedSession(host, "splt002", "11111111-0000-0000-0000-000000000002",
                SessionStatus.COLLECTING, now.minusSeconds(1));
        Session expired = hostedSession(host, "splt003", "11111111-0000-0000-0000-000000000003",
                SessionStatus.EXPIRED, now.plusSeconds(600));
        Session decided = hostedSession(host, "splt004", "11111111-0000-0000-0000-000000000004",
                SessionStatus.DECIDED, now.plusSeconds(600));

        assertThat(sessions.openSummariesOfHost(host, now)).extracting(s -> s.session().id())
                .containsExactly(live.id());
        assertThat(sessions.pastSummariesOfHost(host, now, 10)).extracting(s -> s.session().id())
                .containsExactly(decided.id(), expired.id(), timedOut.id());
        // Tavan gecmisi keser, sirayi degil: en yeni ikisi.
        assertThat(sessions.pastSummariesOfHost(host, now, 2)).extracting(s -> s.session().id())
                .containsExactly(decided.id(), expired.id());
    }

    private Session hostedSession(UUID hostId, String slug, String id, SessionStatus status,
                                  Instant expiresAt) {
        return sessions.saveSession(new Session(UUID.fromString(id), slug, hostId, "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, status, expiresAt, null,
                List.of()));
    }

    /** CSV gidis-donus: 3 aktivite yazilir, ayni sirada geri okunur. */
    @Test
    void activityTypesRoundTripAsCsvInSelectionOrder() {
        UUID hostId = users.upsertByEmail("csv-host@x.dev", "Csv");
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "csv001",
                hostId, "Cuma", List.of(ActivityType.COFFEE, ActivityType.HIKE, ActivityType.BAR),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of()));

        Session loaded = sessions.sessionBySlug(saved.slug()).orElseThrow();

        assertThat(loaded.activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.HIKE, ActivityType.BAR);
    }

    @Test
    void venueProviderFieldsRoundTrip() {
        UUID sessionId = newSession("venue-fields").id();
        Venue v = new Venue(UUID.randomUUID(), sessionId, "google", "g1", "Espresso Bar",
                new GeoPoint(51.44, 5.47), 4.6, 2, null, 0,
                "Espresso bar", "Kleine Berg 16, Eindhoven", "Eindhoven", 312,
                "Tuesday: 8:00 AM – 6:00 PM", "https://maps/g1", ActivityType.COFFEE,
                0.8, 5, "photos/g1/REF1", "Best flat white in town", TaglineSource.FSQ);
        deck.saveVenues(List.of(v));
        assertThat(deck.venuesOf(sessionId).get(0)).isEqualTo(v);
    }

    /** Capa yazilip okunur; yarim capa domain'de zaten uretilemez (GeoPoint), kisit son kapi. */
    @Test
    void anchorSurvivesRoundTrip() {
        GeoPoint anchor = new GeoPoint(52.3676, 4.9041);
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "anchor1",
                users.upsertByEmail("anchor1@x.dev", "Anchor"), "Amsterdam kahvesi",
                List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plus(Duration.ofHours(24)), null, List.of(),
                null, null, null, "Amsterdam", anchor));

        Session read = sessions.sessionBySlug(saved.slug()).orElseThrow();
        assertThat(read.anchor()).isEqualTo(anchor);
        assertThat(read.midpointLabel()).isEqualTo("Amsterdam");
    }

    /** Capasiz oturum null okur — "0,0" gibi bir yalan koordinat uretilmez. */
    @Test
    void missingAnchorReadsBackAsNull() {
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "anchor0",
                users.upsertByEmail("anchor0@x.dev", "Anchorless"), "Orta nokta",
                List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plus(Duration.ofHours(24)), null, List.of()));

        assertThat(sessions.sessionBySlug(saved.slug()).orElseThrow().anchor()).isNull();
    }

    /**
     * Kod bir DEFA uretilir ve oturumun omru boyunca DEGISMEZ. Dort kopya metodunun (withStatus,
     * withMidpointLabel, inRunoff, decided) hepsi ayri ayri sinanir: biri {@code joinCode} yerine
     * null tasisaydi elindeki kodla katilmaya calisan davetli oturumu KAYBEDERDI ve durum
     * degisimine kadar her sey yesil gorunurdu.
     */
    @Test
    void joinCodeSurvivesReloadAndEveryCopyMethod() {
        UUID host = users.upsertByEmail("joincode@x.dev", "Kod");
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "joincd", host, "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of(), null, null, null, null, null,
                "X7K2M"));
        assertThat(reloadJoinCode()).isEqualTo("X7K2M");

        Venue v = venue(saved, "joincd-venue", 0);
        deck.saveVenues(List.of(v));
        Session read = sessions.sessionBySlug("joincd").orElseThrow();

        sessions.saveSession(read.withStatus(SessionStatus.SWIPING));
        assertThat(reloadJoinCode()).isEqualTo("X7K2M");

        sessions.saveSession(read.withMidpointLabel("Eindhoven"));
        assertThat(reloadJoinCode()).isEqualTo("X7K2M");

        sessions.saveSession(read.inRunoff(List.of(v.id()), RunoffReason.FALLBACK));
        assertThat(reloadJoinCode()).isEqualTo("X7K2M");

        sessions.saveSession(read.decided(v.id(), DecisionKind.UNANIMOUS, T0));
        assertThat(reloadJoinCode()).isEqualTo("X7K2M");
    }

    private String reloadJoinCode() {
        return sessions.sessionBySlug("joincd").orElseThrow().joinCode();
    }

    private Session newSession(String slug) {
        UUID host = users.upsertByEmail(slug + "@x.dev", "Host " + slug);
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
    }

    /** Token yok: katilimci artik imzali JWT ile taninir, satir adiyla okunur. */
    private Participant participantNamed(java.util.UUID sessionId, String name) {
        return sessions.participantsOf(sessionId).stream()
                .filter(p -> p.displayName().equals(name)).findFirst().orElseThrow();
    }

    private Participant join(Session s, String name, boolean host) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(), name,
                new GeoPoint(51.6978, 5.3037), host, null, false, null, null));
    }

    private Participant join(Session s, String name, boolean host, TravelMode mode) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(), name,
                new GeoPoint(51.6978, 5.3037), host, null, false, null, mode));
    }

    private Venue venue(Session s, String externalId, int order) {
        return new Venue(UUID.randomUUID(), s.id(), "foursquare", externalId, "Café " + externalId,
                new GeoPoint(51.44, 5.47), 4.6, 2, "https://photo", order);
    }
}
