package com.bumpinto.domain.geo;

import com.bumpinto.domain.session.Participant;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SessionCenterTest {

    private static Participant at(double lat, double lng) {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "Ali",
                new GeoPoint(lat, lng), false, null, false, null, TravelMode.CAR, null);
    }

    /** Capa varsa merkez ODUR: katilimcilar nerede olursa olsun cekmez. */
    @Test
    void anchorWinsOverParticipants() {
        GeoPoint amsterdam = new GeoPoint(52.3676, 4.9041);
        SessionCenter center = SessionCenter.of(amsterdam,
                List.of(at(51.6978, 5.3037), at(51.3855, 5.7120)));

        assertThat(center.point()).isEqualTo(amsterdam);
        assertThat(center.anchored()).isTrue();
    }

    /** Capali yaricap SABIT: yayilim kurali capayi 40 km'ye kadar sisirirdi. */
    @Test
    void anchoredRadiusIsFixedRegardlessOfSpread() {
        GeoPoint amsterdam = new GeoPoint(52.3676, 4.9041);
        SessionCenter near = SessionCenter.of(amsterdam,
                List.of(at(52.36, 4.90), at(52.37, 4.91)));
        SessionCenter far = SessionCenter.of(amsterdam,
                List.of(at(50.85, 4.35), at(53.22, 6.57)));

        assertThat(near.radiusKm()).isEqualTo(far.radiusKm());
    }

    /** Capa yoksa bugunku kural: agirlikli centroid + yayilim yaricapi. */
    @Test
    void withoutAnchorFallsBackToWeightedCentroid() {
        List<Participant> located = List.of(at(51.0, 5.0), at(52.0, 5.0));
        SessionCenter center = SessionCenter.of(null, located);

        assertThat(center.anchored()).isFalse();
        assertThat(center.point().lat()).isBetween(51.4, 51.6);
        assertThat(center.radiusKm()).isPositive();
    }

    /** Capa yok + 2'den az konum = merkez YOK. Cagiran bunu 409'a cevirir. */
    @Test
    void withoutAnchorAndTooFewLocationsReturnsNull() {
        assertThat(SessionCenter.of(null, List.of())).isNull();
        assertThat(SessionCenter.of(null, List.of(at(51.0, 5.0)))).isNull();
    }

    /** Capali oturum HIC konum olmadan da merkeze sahiptir — onkosul boylece duser. */
    @Test
    void anchoredCenterExistsWithNoParticipants() {
        SessionCenter center = SessionCenter.of(new GeoPoint(52.3676, 4.9041), List.of());

        assertThat(center).isNotNull();
        assertThat(center.anchored()).isTrue();
    }
}
