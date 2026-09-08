package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * GDPR tasinabilirligi (R-B6): kisinin KENDI koltuklari. Baskasinin adi, konumu ya da oyu bu
 * porttan HIC gecmez — dis aktarma bir oturum dokumu degil, kisinin kendi izidir.
 */
@FunctionalInterface
public interface UserDataPort {

    record Participation(String sessionSlug, String sessionName, boolean host, Instant joinedAt,
                         String displayName, GeoPoint location, String locationLabel,
                         TravelMode travelMode, long likes, long passes, boolean voted) {
    }

    List<Participation> participationsOf(UUID userId);
}
