package com.bumpinto.domain.session;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Acik plan = oturumun Kesfet'te listelenen varyanti. Kural burada, sorguda ya da uc'ta DEGIL:
 * kapasite siniri, yeter sayi ve TTL tek yerde durur.
 */
class OpenPlanTest {

    static final Instant MEET = Instant.parse("2026-09-13T08:00:00Z");

    @Test
    void capacityOutsideThreeToEightIsRejected() {
        assertThatThrownBy(() -> new OpenPlan(MEET, 2, JoinPolicy.APPROVAL))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenPlan(MEET, 9, JoinPolicy.APPROVAL))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatCode(() -> new OpenPlan(MEET, 3, JoinPolicy.OPEN)).doesNotThrowAnyException();
    }

    @Test
    void confirmedNeedsQuorumOfThree() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.APPROVAL);
        assertThat(p.confirmed(2)).isFalse();
        assertThat(p.confirmed(3)).isTrue();
    }

    /** Kapasite yeter sayidan BAGIMSIZ: 3 kisilik plan hem kesin hem dolu olabilir. */
    @Test
    void fullIsCapacityNotQuorum() {
        OpenPlan p = new OpenPlan(MEET, 3, JoinPolicy.OPEN);
        assertThat(p.full(2)).isFalse();
        assertThat(p.full(3)).isTrue();
    }

    /** Acik planin TTL'i bulusma + 3 saat; 24 saatlik varsayilan oturum TTL'i burada gecersiz. */
    @Test
    void expiresThreeHoursAfterMeet() {
        assertThat(new OpenPlan(MEET, 4, JoinPolicy.APPROVAL).expiresAt())
                .isEqualTo(Instant.parse("2026-09-13T11:00:00Z"));
    }

    /** Sinir dahildir: bulusma ANI gecmis sayilir, "Bulustunuz mu?" o an sorulabilir. */
    @Test
    void meetPassedIncludesTheMeetInstantItself() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.APPROVAL);
        assertThat(p.meetPassed(MEET.minusSeconds(1))).isFalse();
        assertThat(p.meetPassed(MEET)).isTrue();
    }

    /**
     * Wither'lar acik plani TASIR. Bir tanesi unutulursa oturum deste/karar sirasinda sessizce
     * "gizli"ye doner ve Kesfet listesinden duser — testsiz birakilmayacak bir dikis.
     */
    @Test
    void sessionWithersKeepOpenPlan() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.APPROVAL);
        Session s = new Session(UUID.randomUUID(), "abc12345", UUID.randomUUID(), "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING,
                p.expiresAt(), null, List.of(), null, null, null, null, null, "ABCDE", p);

        assertThat(s.isOpenPlan()).isTrue();
        assertThat(s.withStatus(SessionStatus.BROWSING).openPlan()).isEqualTo(p);
        assertThat(s.withMidpointLabel("Stratum").openPlan()).isEqualTo(p);
        assertThat(s.inRunoff(List.of(), RunoffReason.INTERSECTION).openPlan()).isEqualTo(p);
        assertThat(s.decided(UUID.randomUUID(), DecisionKind.UNANIMOUS, MEET).openPlan())
                .isEqualTo(p);
    }

    /** Eski ctor'lar GIZLI oturum uretir: alan eklendi diye bugunku cagri yerleri anlam degistirmez. */
    @Test
    void legacyConstructorsProduceHiddenSessions() {
        Session s = new Session(UUID.randomUUID(), "abc12345", UUID.randomUUID(), "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                MEET, null, List.of());
        assertThat(s.openPlan()).isNull();
        assertThat(s.isOpenPlan()).isFalse();
    }
}
