package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.SeatRequest;
import com.bumpinto.domain.session.SeatStatus;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Acik plana katilim istegi yasam dongusu. Kapilarin SIRASI test edilir: dolu plan kontrolu
 * mukerrer istek kontrolunden SONRA gelirse, reddedilen bir kullaniciya "plan dolu" denir ve
 * neden giremedigini hic ogrenemez.
 */
class SeatRequestsTest {

    static final Instant NOW = Instant.parse("2026-09-08T10:00:00Z");
    static final Instant MEET = Instant.parse("2026-09-13T08:00:00Z");

    FakeStores.InMemorySessionStore sessions;
    FakeStores.InMemorySeatRequestStore seats;
    FakeStores.RecordingEvents events;
    FakeStores.InMemoryBlockStore blocks;
    SessionCommands commands;
    SeatRequests service;

    final UUID host = UUID.randomUUID();
    final UUID priya = UUID.randomUUID();
    final UUID jonas = UUID.randomUUID();
    final UUID tomas = UUID.randomUUID();
    Session plan;

    @BeforeEach
    void setUp() {
        sessions = new FakeStores.InMemorySessionStore();
        seats = new FakeStores.InMemorySeatRequestStore();
        events = new FakeStores.RecordingEvents();
        blocks = new FakeStores.InMemoryBlockStore();
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        commands = new SessionCommands(sessions, events, point -> java.util.Optional.of("Stratum"),
                clock);
        service = new SeatRequests(sessions, seats, blocks, events, clock);
        plan = openPlan("Yürüyüş", 4, JoinPolicy.APPROVAL);
    }

    private Session openPlan(String name, int capacity, JoinPolicy policy) {
        return commands.createSession(host, name, List.of(ActivityType.HIKE), SessionType.GROUP,
                new GeoPoint(51.44, 5.47), "Ayşe", null, TravelMode.BIKE, null,
                new OpenPlan(MEET, capacity, policy)).session();
    }

    private SeatRequests.Ask ask(UUID user, String name) {
        return new SeatRequests.Ask(user, name, new GeoPoint(51.45, 5.48), "Woensel",
                TravelMode.BIKE, "Yeni geldim");
    }

    private List<String> eventTypes() {
        return events.published.stream().map(p -> p.event().type()).toList();
    }

    @Test
    void approvalPolicyLeavesTheRequestPendingAndRingsTheBell() {
        SeatRequest r = service.request(plan.slug(), ask(priya, "Priya"));

        assertThat(r.status()).isEqualTo(SeatStatus.PENDING);
        assertThat(eventTypes()).contains("seat_requests_changed");
        // Koltuk ACILMADI: onaylanmamis istek orta noktayi ve deste geometrisini etkilemez.
        assertThat(sessions.participantsOf(plan.id())).hasSize(1);
    }

    /** OPEN politikada istek ANINDA koltuga doner; host'un onaylamasi beklenmez. */
    @Test
    void openPolicySeatsTheRequesterImmediately() {
        Session open = openPlan("Kahve", 4, JoinPolicy.OPEN);

        SeatRequest r = service.request(open.slug(), ask(priya, "Priya"));

        assertThat(r.status()).isEqualTo(SeatStatus.APPROVED);
        assertThat(sessions.participantsOf(open.id())).hasSize(2);
        assertThat(eventTypes()).contains("participant_joined");
    }

    @Test
    void secondRequestFromTheSameUserIsConflict() {
        service.request(plan.slug(), ask(priya, "Priya"));

        assertThatThrownBy(() -> service.request(plan.slug(), ask(priya, "Priya")))
                .isInstanceOf(ConflictException.class);
    }

    /** Host kendi planina misafir olarak giremez: hayalet koltuk orta noktayi bozar. */
    @Test
    void hostCannotRequestItsOwnPlan() {
        assertThatThrownBy(() -> service.request(plan.slug(), ask(host, "Ayşe")))
                .isInstanceOf(ConflictException.class);
    }

    /** Engel CIFT YONLU: ses odasi ve durt ile ayni kural (K-B35 ile ayni simetri). */
    @Test
    void aBlockedPairCannotRequestInEitherDirection() {
        blocks.save(Block.ofUser(UUID.randomUUID(), host, priya, NOW));
        assertThatThrownBy(() -> service.request(plan.slug(), ask(priya, "Priya")))
                .isInstanceOf(ForbiddenException.class);

        blocks.save(Block.ofUser(UUID.randomUUID(), jonas, host, NOW));
        assertThatThrownBy(() -> service.request(plan.slug(), ask(jonas, "Jonas")))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void approveCreatesAnAccountBackedSeatAndConfirmsAtQuorum() {
        SeatRequest r1 = service.request(plan.slug(), ask(priya, "Priya"));
        SeatRequest r2 = service.request(plan.slug(), ask(jonas, "Jonas"));

        SeatRequests.Decision d1 = service.approve(plan.slug(), host, r1.id());
        assertThat(d1.participant().userId()).isEqualTo(priya);
        assertThat(d1.participant().location()).isEqualTo(new GeoPoint(51.45, 5.48));
        assertThat(d1.participant().host()).isFalse();
        assertThat(d1.confirmed()).isFalse(); // host + Priya = 2, yeter sayi 3

        SeatRequests.Decision d2 = service.approve(plan.slug(), host, r2.id());
        assertThat(d2.confirmed()).isTrue();
        assertThat(eventTypes()).contains("participant_joined");
    }

    @Test
    void onlyTheHostMayDecide() {
        SeatRequest r = service.request(plan.slug(), ask(priya, "Priya"));

        assertThatThrownBy(() -> service.approve(plan.slug(), jonas, r.id()))
                .isInstanceOf(ForbiddenException.class);
        assertThat(service.decline(plan.slug(), host, r.id()).status())
                .isEqualTo(SeatStatus.DECLINED);
    }

    /** Karar BIR KEZ: panele iki kez basmak onaylanmis koltugu reddedemez. */
    @Test
    void aDecidedRequestCannotBeDecidedAgain() {
        SeatRequest r = service.request(plan.slug(), ask(priya, "Priya"));
        service.approve(plan.slug(), host, r.id());

        assertThatThrownBy(() -> service.decline(plan.slug(), host, r.id()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aFullPlanRejectsNewRequests() {
        Session small = openPlan("Kahve", 3, JoinPolicy.OPEN);
        service.request(small.slug(), ask(priya, "Priya")); // OPEN -> aninda koltuk
        service.request(small.slug(), ask(jonas, "Jonas")); // host + 2 = 3 = kapasite

        assertThatThrownBy(() -> service.request(small.slug(), ask(tomas, "Tomás")))
                .isInstanceOf(ConflictException.class);
        assertThat(service.forSession(small.slug(), host))
                .allMatch(s -> s.status() == SeatStatus.APPROVED);
    }

    /** GIZLI oturum Kesfet ucundan gorunmez: "bulunamadi" der, "izin yok" demez (varligi sizmaz). */
    @Test
    void aHiddenSessionIsNotFoundThroughTheSeatRequestEndpoint() {
        Session hidden = commands.createSession(host, "Gizli", List.of(ActivityType.COFFEE),
                SessionType.GROUP, new GeoPoint(51.44, 5.47), "Ayşe", null, TravelMode.CAR, null)
                .session();

        assertThatThrownBy(() -> service.request(hidden.slug(), ask(priya, "Priya")))
                .isInstanceOf(NotFoundException.class);
    }

    /** Kendi istegini gormek icin host olmak gerekmez: `mine` isteyene kendi satirini doner. */
    @Test
    void mineReturnsTheCallersOwnRequestOnly() {
        service.request(plan.slug(), ask(priya, "Priya"));

        assertThat(service.mine(plan.slug(), priya)).isPresent();
        assertThat(service.mine(plan.slug(), jonas)).isEmpty();
    }
}
