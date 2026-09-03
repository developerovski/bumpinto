package com.bumpinto.application.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.support.FakeStores;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserPreferencesTest {

    FakeStores.InMemoryUserStore users;
    UserPreferences prefs;

    @BeforeEach
    void setUp() {
        users = new FakeStores.InMemoryUserStore();
        prefs = new UserPreferences(users);
    }

    @Test
    void updateStoresNormalizedNameAndPreferences() {
        UUID id = users.upsertByEmail("m@x.test", "Mehmet");
        UserProfile p = prefs.update(id, "  Mehmet   Ş. ", new GeoPoint(51.7, 5.3),
                " 's-Hertogenbosch ", ActivityType.COFFEE, "nl", null);
        assertThat(p.name()).isEqualTo("Mehmet Ş.");
        assertThat(p.defaultLocationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(p.language()).isEqualTo("nl");
        assertThat(users.profileOf(id).orElseThrow().defaultActivity()).isEqualTo(ActivityType.COFFEE);
    }

    @Test
    void updateKeepsNameWhenNull_andRejectsUnknownLanguageAndUser() {
        UUID id = users.upsertByEmail("m@x.test", "Mehmet");
        UserProfile p = prefs.update(id, null, null, null, null, null, null);
        assertThat(p.name()).isEqualTo("Mehmet");
        assertThat(p.language()).isNull();
        assertThatThrownBy(() -> prefs.update(id, null, null, null, null, "de", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> prefs.update(UUID.randomUUID(), null, null, null, null, null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void defaultTravelModeIsStoredAndClearable() {
        UUID id = users.upsertByEmail("m2@x.test", "Kerem");
        UserProfile saved = prefs.update(id, null, null, null, null, null, TravelMode.EBIKE);
        assertThat(saved.defaultTravelMode()).isEqualTo(TravelMode.EBIKE);
        assertThat(prefs.update(id, null, null, null, null, null, null).defaultTravelMode())
                .isNull();
    }
}
