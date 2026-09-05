package com.bumpinto.domain.session;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SessionTest {

    private static Session sample(List<ActivityType> activities) {
        return new Session(UUID.randomUUID(), "abc123", UUID.randomUUID(), "Cuma kahvesi",
                activities, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of());
    }

    /** Aktivite listesi kopyalanir: cagiran listeyi sonradan degistirse oturum etkilenmez. */
    @Test
    void activityTypesAreDefensivelyCopied() {
        List<ActivityType> mutable = new java.util.ArrayList<>(
                List.of(ActivityType.COFFEE, ActivityType.HIKE));
        Session session = sample(mutable);
        mutable.clear();
        assertThat(session.activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.HIKE);
    }

    /** Durum/etiket/karar gecisleri aktivite listesini KAYBETMEZ (4 wither de elle sayiyor). */
    @Test
    void witherOperationsPreserveActivityTypes() {
        Session session = sample(List.of(ActivityType.COFFEE, ActivityType.BAR));
        UUID venue = UUID.randomUUID();
        assertThat(session.withStatus(SessionStatus.SWIPING).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.withMidpointLabel("Eindhoven").activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.inRunoff(List.of(venue), RunoffReason.INTERSECTION).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
        assertThat(session.decided(venue, DecisionKind.FORCED, Instant.now()).activityTypes())
                .containsExactly(ActivityType.COFFEE, ActivityType.BAR);
    }
}
