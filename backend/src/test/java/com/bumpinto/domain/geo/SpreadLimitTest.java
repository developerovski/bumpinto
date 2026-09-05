package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpreadLimitTest {

    private static final GeoPoint AMSTERDAM = new GeoPoint(52.3676, 4.9041);
    private static final GeoPoint UTRECHT = new GeoPoint(52.0907, 5.1214);
    private static final GeoPoint EINDHOVEN = new GeoPoint(51.4416, 5.4697);
    private static final GeoPoint ISTANBUL = new GeoPoint(41.0082, 28.9784);

    /** Bos kume: kiyaslanacak kimse yok, ilk konum HER ZAMAN kabul edilir. */
    @Test
    void emptyGroupNeverExceeds() {
        assertThat(SpreadLimit.exceeded(ISTANBUL, List.of())).isFalse();
    }

    /** Sinirin altindaki grup kabul edilir (Amsterdam-Utrecht 34 km). */
    @Test
    void nearbyPointIsAccepted() {
        assertThat(SpreadLimit.exceeded(AMSTERDAM, List.of(UTRECHT))).isFalse();
    }

    /** Uzak nokta reddedilir (Utrecht-Istanbul ~2100 km). */
    @Test
    void farAwayPointExceeds() {
        assertThat(SpreadLimit.exceeded(ISTANBUL, List.of(UTRECHT))).isTrue();
    }

    /** TEK bir uzak uye yeter: aday gruptaki HERKESE yakin olmali (cap kurali, spec S1). */
    @Test
    void oneFarMemberIsEnoughToExceed() {
        assertThat(SpreadLimit.exceeded(EINDHOVEN, List.of(UTRECHT, AMSTERDAM))).isTrue();
        // Ayni aday yalniz Utrecht ile olculseydi (76 km) gecerdi — Amsterdam 110 km ile reddediyor.
        assertThat(SpreadLimit.exceeded(EINDHOVEN, List.of(UTRECHT))).isFalse();
    }
}
