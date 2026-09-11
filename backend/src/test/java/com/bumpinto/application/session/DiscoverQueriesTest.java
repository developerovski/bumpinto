package com.bumpinto.application.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kesfet listesi. Sizinti testi kadar liste testi: kart KESIN konum vermez, dakika yuvarlanmis
 * konumdan hesaplanir ve engelli cift birbirinin planini HIC gormez.
 */
class DiscoverQueriesTest {

    static final Instant NOW = Instant.parse("2026-09-08T10:00:00Z");
    static final GeoPoint EINDHOVEN = new GeoPoint(51.44, 5.47);

    FakeStores.InMemorySessionStore sessions;
    FakeStores.InMemoryBlockStore blocks;
    SessionCommands commands;
    DiscoverQueries discover;

    final UUID viewer = UUID.randomUUID();
    final UUID ayse = UUID.randomUUID();
    final UUID jonas = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        sessions = new FakeStores.InMemorySessionStore();
        blocks = new FakeStores.InMemoryBlockStore();
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        commands = new SessionCommands(sessions, new FakeStores.RecordingEvents(),
                new FakeStores.FakeReverseGeocoder(), clock);
        discover = new DiscoverQueries(sessions, blocks, clock);

        open(ayse, "Genneper yürüyüşü", ActivityType.HIKE, NOW.plus(Duration.ofDays(5)), 4);
        open(jonas, "Pazar kahvesi", ActivityType.COFFEE, NOW.plus(Duration.ofDays(6)), 4);
        // 14 gunluk pencerenin DISI: listede olmamali.
        open(jonas, "Uzak plan", ActivityType.HIKE, NOW.plus(Duration.ofDays(20)), 4);
    }

    private Session open(UUID host, String name, ActivityType type, Instant meet, int capacity) {
        return commands.createSession(host, name, List.of(type), SessionType.GROUP, EINDHOVEN,
                "H", null, TravelMode.BIKE, null,
                new OpenPlan(meet, capacity, JoinPolicy.APPROVAL)).session();
    }

    private List<String> names(List<DiscoverQueries.Row> rows) {
        return rows.stream().map(r -> r.session().name()).toList();
    }

    @Test
    void listsUpcomingPublicPlansOrderedByMeetAt() {
        List<DiscoverQueries.Row> rows = discover.list(viewer, Set.of(), null, null);

        assertThat(names(rows)).containsExactly("Genneper yürüyüşü", "Pazar kahvesi");
        assertThat(rows.get(0).approvedSeats()).isEqualTo(1); // yalniz host
        assertThat(rows.get(0).hostDisplayName()).isEqualTo("H");
        assertThat(rows.get(0).confirmed()).isFalse();        // 1 < yeter sayi 3
    }

    @Test
    void filtersByActivity() {
        assertThat(names(discover.list(viewer, Set.of(ActivityType.COFFEE), null, null)))
                .containsExactly("Pazar kahvesi");
    }

    /**
     * Engel CIFT YONLU gizler. Tek yonlu olsaydi engellenen kisi engelleyenin planini gorur ve
     * istek atardi — engelin kapatmak icin var oldugu temasin ta kendisi.
     */
    @Test
    void hidesPlansOfBlockedHostsBothWays() {
        blocks.save(Block.ofUser(UUID.randomUUID(), viewer, ayse, NOW));
        assertThat(names(discover.list(viewer, Set.of(), null, null)))
                .containsExactly("Pazar kahvesi");

        blocks.save(Block.ofUser(UUID.randomUUID(), jonas, viewer, NOW));
        assertThat(discover.list(viewer, Set.of(), null, null)).isEmpty();
    }

    /** Dolu plan listede DURMAZ: acilamayacak bir karta dokunmak cikmaz sokak. */
    @Test
    void hidesFullPlans() {
        Session small = open(ayse, "Üç kişilik", ActivityType.HIKE,
                NOW.plus(Duration.ofDays(1)), 3);
        FakeStores.InMemorySeatRequestStore seats = new FakeStores.InMemorySeatRequestStore();
        SeatRequests service = new SeatRequests(sessions, seats, blocks,
                new FakeStores.RecordingEvents(), Clock.fixed(NOW, ZoneOffset.UTC));
        service.request(small.slug(), new SeatRequests.Ask(viewer, "V", null, null, null, null));
        service.approve(small.slug(), ayse,
                seats.findBySessionAndUser(small.id(), viewer).orElseThrow().id());
        service.request(small.slug(), new SeatRequests.Ask(jonas, "J", null, null, null, null));
        service.approve(small.slug(), ayse,
                seats.findBySessionAndUser(small.id(), jonas).orElseThrow().id());

        assertThat(names(discover.list(UUID.randomUUID(), Set.of(), null, null)))
                .doesNotContain("Üç kişilik");
    }

    /** Dakika YUVARLANMIS konumdan ve 5 dk basamaginda; konum verilmezse hic hesaplanmaz. */
    @Test
    void minutesComeFromRoundedViewerLocationAndMode() {
        List<DiscoverQueries.Row> rows = discover.list(viewer, Set.of(ActivityType.HIKE),
                new GeoPoint(51.4712, 5.4813), TravelMode.BIKE);

        assertThat(rows.get(0).minutes()).isNotNull();
        assertThat(rows.get(0).minutes() % 5).isZero();
        assertThat(discover.list(viewer, Set.of(), null, null).get(0).minutes()).isNull();
    }
}
