package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionCommandsTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    FakeStores.InMemorySessionStore store;
    FakeStores.RecordingEvents events;
    SessionCommands commands;

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        events = new FakeStores.RecordingEvents();
        commands = new SessionCommands(store, events,
                Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void createSessionStartsCollectingWithHostAsParticipant() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), "Cuma kahvesi", ActivityType.COFFEE, SessionType.GROUP,
                DEN_BOSCH, "Mehmet", null, null);

        assertThat(r.session().status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(r.session().slug()).hasSize(8);
        assertThat(r.session().expiresAt()).isEqualTo(Instant.parse("2026-09-02T10:00:00Z"));
        assertThat(r.hostParticipant().host()).isTrue();
        assertThat(r.hostParticipant().hasLocation()).isTrue();
    }

    @Test
    void joinAddsParticipantAndPublishesEvent() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);

        Participant ayse = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null);

        assertThat(ayse.id()).isNotEqualTo(r.hostParticipant().id());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
        assertThat(events.published).hasSize(1);
        assertThat(events.published.get(0).event().type()).isEqualTo("participant_joined");
    }

    /**
     * Host kendi oturumuna MISAFIR olarak giremez. Onceden katilim ucu cagirani hic sormuyordu:
     * katilimci cerezi olmayan bir tarayicida host katilim formuna dusuyor ve kendi oturumunda
     * ikinci bir koltuk aciyordu. Hayalet koltuk orta noktayi ve deste geometrisini bozar.
     */
    @Test
    void hostCannotTakeASecondSeatInItsOwnSession() {
        UUID hostAccount = UUID.randomUUID();
        SessionCommands.CreateSessionResult r = commands.createSession(
                hostAccount, null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);

        Participant again = commands.join(r.session().slug(), Caller.account(hostAccount),
                "Sahte Misafir", SOMEREN, null, null);

        assertThat(again.id()).isEqualTo(r.hostParticipant().id());
        assertThat(again.host()).isTrue();
        assertThat(store.participantsOf(r.session().id())).hasSize(1);
        assertThat(events.published).isEmpty(); // katilan yeni kimse yok, olay da yok
    }

    /** Cerezini kaybeden uye hayalet koltuk birakmaz: kendi koltugunu geri alir. */
    @Test
    void aSignedInGuestRejoiningKeepsItsSeat() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        UUID guestAccount = UUID.randomUUID();
        Participant first = commands.join(r.session().slug(), Caller.account(guestAccount),
                "Ayşe", SOMEREN, null, null);

        Participant second = commands.join(r.session().slug(), Caller.account(guestAccount),
                "Ayşe", SOMEREN, null, null);

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
    }

    /** Elindeki koltuk token'iyla tekrar katilan da ayni koltukta kalir. */
    @Test
    void rejoiningWithASeatTokenKeepsTheSameSeat() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant first = commands.join(r.session().slug(), Caller.ANONYMOUS,
                "Kerem", SOMEREN, null, null);

        Participant second = commands.join(r.session().slug(), Caller.participant(first.id()),
                "Kerem", SOMEREN, null, null);

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
    }

    /** Davet linki anonim katilima ACIK kalir: kimliksiz her katilim yeni bir koltuktur. */
    @Test
    void anonymousJoinsAlwaysOpenNewSeats() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);

        Participant a = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null)
                ;
        Participant b = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", SOMEREN, null, null)
                ;

        assertThat(a.id()).isNotEqualTo(b.id());
        assertThat(a.userId()).isNull();
        assertThat(store.participantsOf(r.session().id())).hasSize(3);
    }

    /** Silinmis koltugun token'i 404 uretmez, yeni bir koltuk acar. */
    @Test
    void aTokenForARemovedSeatOpensANewOne() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        UUID gone = UUID.randomUUID();

        Participant fresh = commands.join(r.session().slug(), Caller.participant(gone),
                "Kerem", SOMEREN, null, null);

        assertThat(fresh.id()).isNotEqualTo(gone);
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
    }

    /**
     * Anonim katilip SONRA giris yapan kisi koltugunu kaybetmez (K-B23): koltuk hesaba baglanir,
     * boylece ikinci cihazda kurtarilabilir. Yoksa yeniden katilir ve MUKERRER satir acardi.
     */
    @Test
    void anUnownedSeatIsClaimedByTheAccountHoldingIt() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant guest = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null);
        UUID account = UUID.randomUUID();

        Participant claimed = commands.claimSeat(r.session().id(), guest.id(), account).orElseThrow();

        assertThat(claimed.id()).isEqualTo(guest.id());
        assertThat(claimed.userId()).isEqualTo(account);
        // Artik hesap kendi koltugunu bulur: yeniden katilim ikinci satir acmaz.
        assertThat(commands.join(r.session().slug(), Caller.account(account), "Ayşe", SOMEREN, null, null)
                .id()).isEqualTo(guest.id());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
    }

    /**
     * Hesabin o oturumda ZATEN koltugu varsa sahiplenme yapilmaz: elde kalan cerez yanlis koltugu
     * gosteriyordur ve dogru cevap sahiplenmek degil, cerezi onarmaktir.
     */
    @Test
    void aSeatIsNotClaimedWhenTheAccountAlreadyHasOne() {
        UUID hostAccount = UUID.randomUUID();
        SessionCommands.CreateSessionResult r = commands.createSession(
                hostAccount, null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant ghost = commands.join(r.session().slug(), Caller.ANONYMOUS, "Mehmet", SOMEREN, null, null);

        assertThat(commands.claimSeat(r.session().id(), ghost.id(), hostAccount)).isEmpty();
        assertThat(store.participantsOf(r.session().id()).stream()
                .filter(p -> p.id().equals(ghost.id())).findFirst().orElseThrow().userId()).isNull();
    }

    /** Sahibi olan koltuk el DEGISTIRMEZ — token'i ele geciren onu devralamaz. */
    @Test
    void anOwnedSeatIsNeverTakenOverByAnotherAccount() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        UUID owner = UUID.randomUUID();
        Participant seat = commands.join(r.session().slug(), Caller.account(owner), "Ayşe", SOMEREN, null, null);

        assertThat(commands.claimSeat(r.session().id(), seat.id(), UUID.randomUUID())).isEmpty();
        assertThat(store.participantsOf(r.session().id()).stream()
                .filter(p -> p.id().equals(seat.id())).findFirst().orElseThrow().userId())
                .isEqualTo(owner);
    }

    @Test
    void joinUnknownSlugThrowsNotFound() {
        assertThatThrownBy(() -> commands.join("yok", Caller.ANONYMOUS, "X", null, null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateLocationSetsCoordinates() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", null, null, null);
        assertThat(kerem.hasLocation()).isFalse();

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren", null);

        assertThat(store.participants.get(kerem.id()).hasLocation()).isTrue();
        assertThat(store.participants.get(kerem.id()).locationLabel()).isEqualTo("Someren");
        // Yayin sart: lobideki "kim hazir" sayaci buna bagli. Yayinlanmazsa host, davetlinin
        // konumunu ancak bir sonraki poll'de gorur — canli kanal varken 3 sn beklemek.
        assertThat(events.published).extracting(p -> p.event().type())
                .contains("location_updated");
    }

    @Test
    void updateLocationWithoutLabelKeepsExistingLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", SOMEREN, "Someren", null);

        commands.updateLocation(r.session().slug(), kerem.id(), DEN_BOSCH, null, null);

        assertThat(store.participants.get(kerem.id()).location()).isEqualTo(DEN_BOSCH);
        assertThat(store.participants.get(kerem.id()).locationLabel()).isEqualTo("Someren");
    }

    @Test
    void joinRejectsSessionPastItsExpiryWithoutWritingStatus() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z").join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
        assertThat(store.sessions.get(r.session().id()).status()).isEqualTo(SessionStatus.COLLECTING);
    }

    @Test
    void updateLocationRejectsSessionPastItsExpiry() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", null, null, null);

        assertThatThrownBy(() -> commandsAt("2026-09-02T10:00:01Z")
                .updateLocation(r.session().slug(), kerem.id(), SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining(SessionStatus.EXPIRED.name());
    }

    SessionCommands commandsAt(String instant) {
        return new SessionCommands(store, events, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }

    @Test
    void createSessionCarriesTypeAndHostLocationLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Ayşe'yle kahve", ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet",
                "'s-Hertogenbosch", null);
        assertThat(r.session().sessionType()).isEqualTo(SessionType.SOLO);
        assertThat(r.hostParticipant().locationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(r.hostParticipant().manual()).isFalse();
    }

    @Test
    void addPointCreatesManualParticipantOnlyForSoloHostWhileCollecting() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.hostParticipant().id(),
                "Ayşe", "Someren", SOMEREN, null);
        assertThat(ayse.manual()).isTrue();
        // Elle konumun token'i olmaz: token yalniz ParticipantTokenDelivery'de uretilir ve
        // addPoint o yoldan GECMEZ — yani manuel nokta hicbir zaman kimlik tasiyamaz.
        assertThat(ayse.host()).isFalse();
        assertThat(ayse.locationLabel()).isEqualTo("Someren");
        assertThat(store.participantsOf(solo.session().id())).hasSize(2);

        assertThatThrownBy(() -> commands.addPoint(solo.session().slug(), UUID.randomUUID(),
                "X", null, SOMEREN, null)).isInstanceOf(ForbiddenException.class);

        SessionCommands.CreateSessionResult group = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        assertThatThrownBy(() -> commands.addPoint(group.session().slug(), group.hostParticipant().id(),
                "Ayşe", "Someren", SOMEREN, null)).isInstanceOf(ConflictException.class);
    }

    @Test
    void removePointDeletesOnlyManualParticipants() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.hostParticipant().id(),
                "Ayşe", "Someren", SOMEREN, null);
        commands.removePoint(solo.session().slug(), solo.hostParticipant().id(), ayse.id());
        assertThat(store.participantsOf(solo.session().id())).hasSize(1);
        assertThat(events.published).extracting(p -> p.event().type())
                .containsExactly("participant_joined", "participant_left");
        assertThatThrownBy(() -> commands.removePoint(solo.session().slug(), solo.hostParticipant().id(),
                solo.hostParticipant().id())).isInstanceOf(ConflictException.class);
    }

    @Test
    void joinIsRejectedOnSoloSession() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, null);
        assertThatThrownBy(() -> commands.join(solo.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("solo");
    }

    @Test
    void joinCarriesTravelModeAndDefaultsToCar() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, TravelMode.BIKE);
        assertThat(r.hostParticipant().travelMode()).isEqualTo(TravelMode.BIKE);

        Participant kerem = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", SOMEREN, "Someren",
                TravelMode.EBIKE);
        assertThat(kerem.travelMode()).isEqualTo(TravelMode.EBIKE);

        // Mod verilmeyen katilim CAR: "gec katilanlar da CAR" (spec §4.5b)
        Participant ayse = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN, "Someren", null);
        assertThat(ayse.travelMode()).isEqualTo(TravelMode.CAR);
    }

    @Test
    void updateLocationCanChangeTravelModeAndNullKeepsIt() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.join(r.session().slug(), Caller.ANONYMOUS, "Kerem", null, null, TravelMode.WALK);

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren", null);
        assertThat(store.participants.get(kerem.id()).travelMode()).isEqualTo(TravelMode.WALK);

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren",
                TravelMode.TRANSIT);
        assertThat(store.participants.get(kerem.id()).travelMode()).isEqualTo(TravelMode.TRANSIT);
    }

    @Test
    void manualPointsDefaultToCarWhenModeOmitted() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, TravelMode.BIKE);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.hostParticipant().id(),
                "Ayşe", "Someren", SOMEREN, null);
        assertThat(ayse.travelMode()).isEqualTo(TravelMode.CAR);
    }

    @Test
    void manualPointsCarryTravelModeWhenGiven() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.addPoint(solo.session().slug(), solo.hostParticipant().id(),
                "Kerem", "Someren", SOMEREN, TravelMode.BIKE);
        assertThat(kerem.travelMode()).isEqualTo(TravelMode.BIKE);

        Participant ayse = commands.addPoint(solo.session().slug(), solo.hostParticipant().id(),
                "Ayşe", "Someren", SOMEREN, null);
        assertThat(ayse.travelMode()).isEqualTo(TravelMode.CAR);
    }

    @Test
    void newSeatsAreRefusedOnceTheDeckStarted() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH,
                "Mehmet", null, null);
        store.saveSession(r.session().withStatus(SessionStatus.SWIPING));

        assertThatThrownBy(() -> commands.join(r.session().slug(), Caller.ANONYMOUS, "Geç",
                SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("closed for new participants");
    }

    /**
     * Kapi YALNIZ yeni koltuga: sekmesini yenileyen uye kendi koltugunu her durumda geri alir.
     * Kapi seatOf'tan ONCE olsaydi deste ortasinda sayfayi yenileyen kisi 409 gorurdu.
     */
    @Test
    void existingSeatsAreStillRecoveredAfterTheDeckStarted() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH,
                "Mehmet", null, null);
        Participant ayse = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN,
                null, null);
        store.saveSession(r.session().withStatus(SessionStatus.RUNOFF));

        Participant again = commands.join(r.session().slug(), Caller.participant(ayse.id()),
                "Ayşe", null, null, null);

        assertThat(again.id()).isEqualTo(ayse.id());
    }
}
