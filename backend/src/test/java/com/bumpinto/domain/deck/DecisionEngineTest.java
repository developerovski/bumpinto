package com.bumpinto.domain.deck;

import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DecisionEngineTest {

    static final UUID V1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID V2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
    static final UUID V3 = UUID.fromString("00000000-0000-0000-0000-000000000003");
    static final UUID V4 = UUID.fromString("00000000-0000-0000-0000-000000000004");

    static final Map<UUID, Double> RATINGS = Map.of(V1, 4.0, V2, 4.5, V3, 4.9, V4, 3.0);

    final DecisionEngine engine = new DecisionEngine();

    static ParticipantLikes done(Set<UUID> likes) {
        return new ParticipantLikes(UUID.randomUUID(), true, likes);
    }

    static ParticipantLikes notDone(Set<UUID> likes) {
        return new ParticipantLikes(UUID.randomUUID(), false, likes);
    }

    @Test
    void singleCommonVenueIsDecidedWithoutRunoff() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2)),
                done(Set.of(V1, V3)),
                done(Set.of(V1))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.UNANIMOUS));
    }

    @Test
    void multipleCommonVenuesGoToRunoffOrderedByLikesThenRating() {
        // V1 ve V2 kesisimde (2'ser begeni); esitligi rating kirar: V2 (4.5) > V1 (4.0)
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2)),
                done(Set.of(V1, V2, V3))), RATINGS);
        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        DeckOutcome.Runoff runoff = (DeckOutcome.Runoff) out;
        assertThat(runoff.venueIds()).isEqualTo(List.of(V2, V1));
        assertThat(runoff.reason()).isEqualTo(RunoffReason.INTERSECTION);
    }

    @Test
    void emptyIntersectionFallsBackToTopThreeByLikesThenRating() {
        // begeniler: V1=2, V2=2, V3=1, V4=1; kesisim bos
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2, V3)),
                done(Set.of(V1, V2, V4)),
                done(Set.of())), RATINGS);
        // siralama: V2(2,4.5), V1(2,4.0), V3(1,4.9) — V4(1,3.0) elenir
        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        DeckOutcome.Runoff runoff = (DeckOutcome.Runoff) out;
        assertThat(runoff.venueIds()).isEqualTo(List.of(V2, V1, V3));
        assertThat(runoff.reason()).isEqualTo(RunoffReason.FALLBACK);
    }

    @Test
    void unfinishedParticipantsAreIgnored() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of(V1)),
                notDone(Set.of(V4))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.UNANIMOUS));
    }

    @Test
    void noLikesAtAllYieldsNoLikes() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of()),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.NoLikes());
    }

    @Test
    void fallbackWithSingleCandidateIsDecidedNotRunoff() {
        // kesisim bos ({V1} n {} = {}), toplamda tek aday V1 -> dogrudan karar
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.SINGLE_LIKE));
    }

    @Test
    void noFinishedParticipantThrows() {
        assertThatThrownBy(() -> engine.decide(List.of(notDone(Set.of(V1))), RATINGS))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void intersectionRunoffCarriesItsReasonAndCapsFinalistsAtFour() {
        UUID v5 = UUID.fromString("00000000-0000-0000-0000-000000000005");
        Map<UUID, Double> ratings = Map.of(V1, 4.0, V2, 4.5, V3, 4.9, V4, 3.0, v5, 4.8);
        Set<UUID> all = Set.of(V1, V2, V3, V4, v5);
        DeckOutcome out = engine.decide(List.of(done(all), done(all)), ratings);

        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        DeckOutcome.Runoff runoff = (DeckOutcome.Runoff) out;
        assertThat(runoff.reason()).isEqualTo(RunoffReason.INTERSECTION);
        // Tavan 4 (spec §4 notu); esitlik PUANLA kirilir → en dusuk puanli V4 (3.0) elenir.
        assertThat(runoff.venueIds()).hasSize(4).doesNotContain(V4);
        assertThat(runoff.venueIds().get(0)).isEqualTo(V3); // 4.9 en yuksek
    }

    @Test
    void fallbackRunoffCarriesFallbackReason() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of(V2))), RATINGS);
        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        assertThat(((DeckOutcome.Runoff) out).reason()).isEqualTo(RunoffReason.FALLBACK);
    }

    @Test
    void singleLikedVenueOutsideIntersectionIsSingleLike() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.SINGLE_LIKE));
    }
}
