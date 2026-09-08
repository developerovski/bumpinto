package com.bumpinto.application.text;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class IdsTest {

    @Test
    void joinCodeIsFiveCharsFromTheUnambiguousAlphabet() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String code = Ids.joinCode();
            assertThat(code).hasSize(5).matches("[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}");
            seen.add(code);
        }
        assertThat(seen).hasSizeGreaterThan(450);
    }

    @Test
    void normalizeAcceptsLowercaseAndSeparatorsAndRejectsTheRest() {
        assertThat(Ids.normalizeJoinCode(" x7k-2m ")).isEqualTo("X7K2M");
        assertThat(Ids.normalizeJoinCode("x7k2")).isNull();
        assertThat(Ids.normalizeJoinCode("X7K2I")).isNull();
        assertThat(Ids.normalizeJoinCode(null)).isNull();
    }
}
