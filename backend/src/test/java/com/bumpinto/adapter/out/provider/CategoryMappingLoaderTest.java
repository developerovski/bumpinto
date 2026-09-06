package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CategoryMappingLoaderTest {

    @Test
    void loadsEveryActivityTypeFromClasspath() {
        CategoryMapping map = new CategoryMappingLoader().load("foursquare");

        assertThat(map.byType()).containsOnlyKeys(ActivityType.values());
        assertThat(map.idsFor(List.of(ActivityType.COFFEE)))
                .containsExactly("4bf58dd8d48988d1e0931735");
    }

    /** idPattern BICIM korumasidir: 5 haneli eski taksonomi kodu FSQ'da 400 verir (2026-09-06). */
    @Test
    void rejectsIdThatBreaksThePattern() {
        assertThatThrownBy(() -> new CategoryMappingLoader().load("broken-fixture"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("13032")
                .hasMessageContaining("^[0-9a-f]{24}$");
    }
}
