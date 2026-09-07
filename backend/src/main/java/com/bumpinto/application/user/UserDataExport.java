package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserDataPort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Tek istekte tasinabilir JSON. Konum YUVARLANIR (2 ondalik, ~1.1 km): dosya paylasilabilir bir
 * artefakttir; icinde ev adresi hassasiyetinde koordinat tasimasi gereksiz risktir.
 */
@Service
public class UserDataExport {

    public record Profile(String email, String displayName, String language,
                          String defaultActivity, String defaultTravelMode,
                          Double defaultLat, Double defaultLng, String defaultLocationLabel) {
    }

    public record Participation(String sessionSlug, String sessionName, boolean host,
                                Instant joinedAt, String displayName, Double lat, Double lng,
                                String locationLabel, TravelMode travelMode,
                                long likes, long passes, boolean voted) {
    }

    public record Export(Instant exportedAt, Profile profile, List<Participation> participations) {
    }

    private final UserStorePort users;
    private final UserDataPort data;
    private final Clock clock;

    public UserDataExport(UserStorePort users, UserDataPort data, Clock clock) {
        this.users = users;
        this.data = data;
        this.clock = clock;
    }

    public Export of(UUID userId) {
        UserProfile p = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        GeoPoint home = p.defaultLocation() == null ? null
                : TravelMinutes.approx(p.defaultLocation());
        Profile profile = new Profile(p.email(), p.name(), p.language(),
                p.defaultActivity() == null ? null : p.defaultActivity().name(),
                p.defaultTravelMode() == null ? null : p.defaultTravelMode().name(),
                home == null ? null : home.lat(), home == null ? null : home.lng(),
                p.defaultLocationLabel());
        return new Export(clock.instant(), profile,
                data.participationsOf(userId).stream().map(UserDataExport::toRow).toList());
    }

    private static Participation toRow(UserDataPort.Participation r) {
        GeoPoint rounded = r.location() == null ? null : TravelMinutes.approx(r.location());
        return new Participation(r.sessionSlug(), r.sessionName(), r.host(), r.joinedAt(),
                r.displayName(), rounded == null ? null : rounded.lat(),
                rounded == null ? null : rounded.lng(), r.locationLabel(), r.travelMode(),
                r.likes(), r.passes(), r.voted());
    }
}
