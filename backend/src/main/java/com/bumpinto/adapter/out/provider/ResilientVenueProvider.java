package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Component
@Primary
public class ResilientVenueProvider implements VenueProviderPort {

    private static final Logger log = LoggerFactory.getLogger(ResilientVenueProvider.class);

    private final FoursquareVenueProvider primary;
    private final GooglePlacesVenueProvider secondary;
    private final Cache<String, List<VenueCandidate>> cache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30))
            .build();

    public ResilientVenueProvider(FoursquareVenueProvider primary,
                                  GooglePlacesVenueProvider secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        String key = String.format(Locale.ROOT, "%.3f:%.3f:%.1f:%s:%d",
                center.lat(), center.lng(), radiusKm, type, limit);
        List<VenueCandidate> cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        List<VenueCandidate> result = searchWithFallback(center, radiusKm, type, limit);
        // BOS sonuc CACHE'LENMEZ: seyrek bolgede gecici bir bosluk 30 dk boyunca
        // "mekan yok"a donusurdu. Hata durumu da cache'lenmez (istisna yukari gider).
        if (!result.isEmpty()) {
            cache.put(key, result);
        }
        return result;
    }

    private List<VenueCandidate> searchWithFallback(GeoPoint center, double radiusKm,
                                                    ActivityType type, int limit) {
        try {
            List<VenueCandidate> result = primary.search(center, radiusKm, type, limit);
            if (!result.isEmpty()) {
                return result;
            }
        } catch (RuntimeException e) {
            // birincil dustu -- yedege gec (spec 6). Mesaj anahtar icermez.
            log.warn("foursquare search failed, falling back to google: {}", e.getMessage());
        }
        return secondary.search(center, radiusKm, type, limit);
    }
}
