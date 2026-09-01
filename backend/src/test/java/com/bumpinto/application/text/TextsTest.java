package com.bumpinto.application.text;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextsTest {

    @Test
    void stripsControlCharsCollapsesWhitespaceAndCapsLength() {
        assertThat(Texts.displayName("  Meh\u0000met   Şerefoğlu  ")).isEqualTo("Mehmet Şerefoğlu");
        assertThat(Texts.displayName("x".repeat(45))).hasSize(40);
    }

    @Test
    void keepsLegitimatePunctuation() {
        // tırnak ayıklama bilinçli olarak YOK — injection parametrik sorgularla engellenir
        assertThat(Texts.displayName("'s-Hertogenbosch'lu Ayşe")).isEqualTo("'s-Hertogenbosch'lu Ayşe");
    }

    @Test
    void blankNameIsRejected() {
        assertThatThrownBy(() -> Texts.displayName("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Texts.displayName(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
