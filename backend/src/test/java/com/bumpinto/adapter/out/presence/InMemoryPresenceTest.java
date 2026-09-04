package com.bumpinto.adapter.out.presence;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryPresenceTest {

    /** Grace penceresi zaman ISTER; Clock.fixed ile olculemez, Thread.sleep ile olculmemeli. */
    static final class TickingClock extends Clock {
        Instant now = Instant.parse("2026-09-04T10:00:00Z");

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override public Instant instant() {
            return now;
        }
    }

    TickingClock clock;
    InMemoryPresence presence;
    UUID session;
    UUID ayse;
    UUID mehmet;

    @BeforeEach
    void setUp() {
        clock = new TickingClock();
        presence = new InMemoryPresence(clock);
        session = UUID.randomUUID();
        ayse = UUID.randomUUID();
        mehmet = UUID.randomUUID();
    }

    @Test
    void connectedParticipantIsPresent() {
        presence.arrived(session, ayse, "ws-1");

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void shortDisconnectStaysPresentWithinGrace() {
        presence.arrived(session, ayse, "ws-1");
        presence.left(session, ayse, "ws-1");
        clock.advance(Duration.ofSeconds(30));

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void staleDisconnectDropsOutAfterGrace() {
        presence.arrived(session, ayse, "ws-1");
        presence.left(session, ayse, "ws-1");
        clock.advance(Duration.ofSeconds(46));

        assertThat(presence.presentIn(session)).isEmpty();
    }

    @Test
    void closingOneOfTwoTabsKeepsTheSeatPresent() {
        presence.arrived(session, ayse, "ws-1");
        presence.arrived(session, ayse, "ws-2");
        presence.left(session, ayse, "ws-1");
        clock.advance(Duration.ofHours(2));

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    /**
     * B-7'nin gercek arizasi: STOMP CONNECT'i hic gondermeden kapanan bir soket icin de
     * SessionDisconnectEvent gelir (handshake nitelikleri HTTP asamasinda yazilir), yani
     * arrived() hic cagrilmamis bir wsSessionId icin left() calisabilir — React StrictMode'un
     * gelistirmede yaptigi cift-mount tam olarak bunu tetikler. Eslesmeyen left, saglikli
     * ikinci sekmenin baglantisini SILMEMELI (eski sayac tasarimi silerdi: bkz. Seat.openConnections).
     */
    @Test
    void unmatchedLeftDoesNotDropAHealthyConnection() {
        presence.arrived(session, ayse, "ws-1"); // gercek sekme, STOMP CONNECT gonderdi
        presence.left(session, ayse, "ws-ghost"); // hic arrived olmamis bir soketin kopmasi

        assertThat(presence.presentIn(session)).containsExactly(ayse);
        clock.advance(Duration.ofHours(2)); // grace'e hic girmedi: ws-1 hala acik
        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void presenceIsScopedToItsOwnSession() {
        UUID other = UUID.randomUUID();
        presence.arrived(session, ayse, "ws-1");
        presence.arrived(other, mehmet, "ws-1");

        assertThat(presence.presentIn(session)).containsExactly(ayse);
        assertThat(presence.presentIn(other)).containsExactly(mehmet);
    }
}
