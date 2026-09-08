package com.bumpinto.domain.venue;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TaglinesTest {

    @Test
    void firstUsableTipBecomesASingleSentenceUnderEightyChars() {
        assertThat(Taglines.fromTips(List.of(
                "Best flat white in town. Also they roast their own beans on Tuesdays.")))
                .isEqualTo("Best flat white in town");
    }

    @Test
    void longTipIsCutAtAWordBoundaryWithEllipsis() {
        String tip = "A very cosy corner place where the baristas remember your name and the "
                + "pastries are baked on site every single morning before seven";
        String out = Taglines.fromTips(List.of(tip));
        assertThat(out).hasSizeLessThanOrEqualTo(80).endsWith("…");
        assertThat(tip).startsWith(out.substring(0, out.length() - 1).strip());
    }

    @Test
    void spamAndTooShortTipsAreSkipped() {
        assertThat(Taglines.fromTips(List.of("ok", "visit https://spam.example", " "))).isNull();
        assertThat(Taglines.fromTips(null)).isNull();
    }

    @Test
    void openDataFallsBackToCategoryAndLocality() {
        assertThat(Taglines.fromCategory("espresso bar", "Eindhoven"))
                .isEqualTo("Espresso bar · Eindhoven");
        assertThat(Taglines.fromCategory("Bakery", null)).isEqualTo("Bakery");
        assertThat(Taglines.fromCategory("  ", "Eindhoven")).isNull();
    }
}
