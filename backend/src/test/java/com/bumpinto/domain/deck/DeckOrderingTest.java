package com.bumpinto.domain.deck;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.Fairness;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DeckOrderingTest {

    static final UUID P = UUID.fromString("00000000-0000-0000-0000-0000000000aa");

    record Item(String name, int max, int spread) {
    }

    static Fairness fairnessOf(Item i) {
        return new Fairness(i.max(), i.spread(), P);
    }

    static List<String> names(List<Item> items, long seed) {
        return DeckOrdering.fairnessFirst(items, DeckOrderingTest::fairnessOf, seed).stream()
                .map(Item::name).toList();
    }

    @Test
    void primaryKeyIsLongestTripThenSpread() {
        List<Item> items = List.of(new Item("uzak", 50, 5), new Item("adil", 25, 5),
                new Item("yakin-ama-dengesiz", 25, 20));
        assertThat(names(items, 42L)).containsExactly("adil", "yakin-ama-dengesiz", "uzak");
    }

    @Test
    void equalFairnessIsShuffledDeterministicallyBySeed() {
        List<Item> items = List.of(new Item("a", 25, 5), new Item("b", 25, 5),
                new Item("c", 25, 5), new Item("d", 25, 5));
        List<String> first = names(items, 7L);
        assertThat(names(items, 7L)).isEqualTo(first);           // ayni tohum → ayni sira
        assertThat(first).containsExactlyInAnyOrder("a", "b", "c", "d");
        assertThat(names(items, 99L)).isNotEqualTo(first);        // farkli tohum → farkli sira
    }

    @Test
    void shuffleNeverCrossesAFairnessGroup() {
        List<Item> items = List.of(new Item("uzak1", 50, 0), new Item("uzak2", 50, 0),
                new Item("adil1", 20, 0), new Item("adil2", 20, 0));
        assertThat(names(items, 3L).subList(0, 2)).containsExactlyInAnyOrder("adil1", "adil2");
        assertThat(names(items, 3L).subList(2, 4)).containsExactlyInAnyOrder("uzak1", "uzak2");
    }

    @Test
    void fairnessOfEmptyMapIsZeroAndLongestIsTheSlowestParticipant() {
        assertThat(Fairness.of(Map.of())).isEqualTo(new Fairness(0, 0, null));
        UUID a = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID b = UUID.fromString("00000000-0000-0000-0000-000000000002");
        Map<UUID, Integer> minutes = new java.util.LinkedHashMap<>();
        minutes.put(a, 20);
        minutes.put(b, 45);
        Fairness f = Fairness.of(minutes);
        assertThat(f.maxMinutes()).isEqualTo(45);
        assertThat(f.spreadMinutes()).isEqualTo(25);
        assertThat(f.longestParticipantId()).isEqualTo(b);
    }
}
