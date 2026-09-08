package com.bumpinto.domain.venue;

import com.bumpinto.domain.session.ActivityType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CategoryMappingTest {

    static final CategoryMapping MAP = new CategoryMapping(Map.of(
            ActivityType.COFFEE, List.of("c1"),
            ActivityType.FOOD, List.of("f1", "f2")));

    @Test
    void coversOnlyFullyMappedSelectionsAndFlattensIdsInOrder() {
        assertThat(MAP.covers(List.of(ActivityType.COFFEE, ActivityType.FOOD))).isTrue();
        assertThat(MAP.covers(List.of(ActivityType.COFFEE, ActivityType.SWIM))).isFalse();
        assertThat(MAP.covers(List.of())).isFalse();
        assertThat(MAP.idsFor(List.of(ActivityType.FOOD, ActivityType.COFFEE)))
                .containsExactly("f1", "f2", "c1");
    }

    /** Atif ADLA degil KIMLIKLE geri eslenir (spec §5.1). */
    @Test
    void activityForResolvesAttributionById() {
        assertThat(MAP.activityFor("f2")).isEqualTo(ActivityType.FOOD);
        assertThat(MAP.activityFor("nope")).isNull();
    }
}
