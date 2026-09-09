package com.bumpinto.application.user;

import com.bumpinto.adapter.out.quota.InMemoryAccountQuota;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.error.TooManyRequestsException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserDataPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserDataExportTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    static final UUID ME = UUID.randomUUID();

    private UserDataExport export(List<UserDataPort.Participation> rows) {
        return export(rows, new GeoPoint(51.441642, 5.469722));
    }

    private UserDataExport export(List<UserDataPort.Participation> rows, GeoPoint home) {
        return export(rows, home, UUID.randomUUID());
    }

    /** Kota GERCEK adaptor: "hesap basina" iddiasi sahte bir kovayla kanitlanamaz. */
    private UserDataExport export(List<UserDataPort.Participation> rows, GeoPoint home,
                                  UUID... alsoKnownAccounts) {
        Clock clock = Clock.fixed(T0, ZoneOffset.UTC);
        FakeStores.InMemoryUserStore users = new FakeStores.InMemoryUserStore();
        users.saveProfile(new UserProfile(ME, "ayse@example.com", "Ayşe", home, "Eindhoven",
                ActivityType.COFFEE, "tr", TravelMode.BIKE));
        for (UUID other : alsoKnownAccounts) {
            users.saveProfile(new UserProfile(other, "kerem@example.com", "Kerem", null, null,
                    null, "tr", TravelMode.CAR));
        }
        UserDataPort data = userId -> ME.equals(userId) ? rows : List.of();
        return new UserDataExport(users, data, new InMemoryAccountQuota(clock), clock);
    }

    @Test
    void coordinatesAreRoundedAndLocationlessSeatsCarryNone() {
        UserDataExport.Export out = export(List.of(
                new UserDataPort.Participation("abc12345", "Cuma kahvesi", true, T0, "Ayşe",
                        new GeoPoint(51.441642, 5.469722), "Eindhoven", TravelMode.BIKE, 7, 3, true),
                new UserDataPort.Participation("def67890", null, false, T0, "Ayşe",
                        null, null, TravelMode.CAR, 0, 0, false))).of(ME);

        UserDataExport.Participation located = out.participations().get(0);
        assertThat(located.lat()).isEqualTo(51.44);
        assertThat(located.lng()).isEqualTo(5.47);
        assertThat(located.likes()).isEqualTo(7);
        assertThat(located.passes()).isEqualTo(3);
        assertThat(located.voted()).isTrue();
        assertThat(out.participations().get(1).lat()).isNull();
        assertThat(out.participations().get(1).lng()).isNull();
        assertThat(out.exportedAt()).isEqualTo(T0);
        assertThat(out.profile().email()).isEqualTo("ayse@example.com");
    }

    /** Ev adresi de yuvarlanir: dosya paylasilabilir, icinde tam koordinat tasimamali. */
    @Test
    void defaultLocationIsRoundedAndOptional() {
        UserDataExport.Profile withHome = export(List.of()).of(ME).profile();
        assertThat(withHome.defaultLat()).isEqualTo(51.44);
        assertThat(withHome.defaultLng()).isEqualTo(5.47);
        assertThat(withHome.defaultActivity()).isEqualTo("COFFEE");
        assertThat(withHome.defaultTravelMode()).isEqualTo("BIKE");
        assertThat(withHome.language()).isEqualTo("tr");
        assertThat(withHome.displayName()).isEqualTo("Ayşe");

        UserDataExport.Profile without = export(List.of(), null).of(ME).profile();
        assertThat(without.defaultLat()).isNull();
        assertThat(without.defaultLng()).isNull();
    }

    /** Silinmis/bilinmeyen hesap 500 degil 404 verir — dosya yoksa yok. */
    @Test
    void unknownUserIsNotFound() {
        UserDataExport export = export(List.of());
        UUID stranger = UUID.randomUUID();
        assertThatThrownBy(() -> export.of(stranger)).isInstanceOf(NotFoundException.class);
    }

    /**
     * K-B34 regresyonu: kota HESABA anahtarli. Kural IP'ye anahtarli filtrede dururken gercek
     * limit "kullanici basina 1/saat" degil, ingress arkasinda "KURULUM basina 1/saat"ti — yani
     * bir kullanicinin dosyasi digerlerinin saatini yakiyordu.
     */
    @Test
    void theHourlyQuotaIsPerAccountNotPerInstallation() {
        UUID kerem = UUID.randomUUID();
        UserDataExport export = export(List.of(), null, kerem);

        assertThat(export.of(ME).profile().email()).isEqualTo("ayse@example.com");
        assertThatThrownBy(() -> export.of(ME)).isInstanceOf(TooManyRequestsException.class);

        // Ayşe'nin dosyası Kerem'in saatini YAKMAZ.
        assertThat(export.of(kerem).profile().email()).isEqualTo("kerem@example.com");
        assertThatThrownBy(() -> export.of(kerem)).isInstanceOf(TooManyRequestsException.class);
    }
}
