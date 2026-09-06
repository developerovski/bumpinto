package com.bumpinto.adapter.out.open;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

/** Kendi PostGIS'imiz: ucretsiz, sinirsiz, saklanabilir (spec §5.2). */
@Component
@Order(2)
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.open", name = "enabled", havingValue = "true")
public class OpenVenueSource implements VenueSource {

    public static final String ID = "open";

    /** Overture olcumu; altindaki satir "muhtemelen kapali" sayilir (spec §4.6). */
    static final double MIN_CONFIDENCE = 0.6;

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.open", "https://www.openstreetmap.org/copyright", null,
            RetentionRule.KEEP, false, MapEngine.ANY, ZoneOffset.UTC);

    private final VenueOpenRepository rows;
    private final CategoryMapping categories;

    public OpenVenueSource(VenueOpenRepository rows, CategoryMappingLoader loader) {
        this.rows = rows;
        this.categories = loader.load(ID);
    }

    @Override public VenueSourceDescriptor descriptor() { return DESCRIPTOR; }

    @Override public CategoryMapping categories() { return categories; }

    @Override
    @Transactional(readOnly = true)
    public SearchResult search(SearchRequest request) {
        if (request.types().isEmpty()) {
            return SearchResult.empty();
        }
        String types = request.types().stream().map(Enum::name).collect(Collectors.joining(","));
        List<VenueCandidate> out = rows
                .nearby(request.center().lat(), request.center().lng(),
                        request.radiusKm() * 1000, types, MIN_CONFIDENCE, request.limit())
                .stream().map(row -> toCandidate(row, request.types())).toList();
        return new SearchResult(out, null); // yerel kaynagin kotasi yok
    }

    private VenueCandidate toCandidate(OpenVenueRow row, List<ActivityType> requested) {
        return new VenueCandidate(ID, row.getId(), row.getName(),
                new GeoPoint(row.getLat(), row.getLng()),
                null, null, row.getPhotoUrl(), row.getCategory(), row.getAddress(),
                row.getLocality(), null, row.getOpeningHours(), row.getWebsite(),
                attribution(row, requested), null, null, null);
    }

    /** Satirin turleriyle SECILEN turlerin ilk kesisimi; kesismiyorsa null (uydurulmaz). */
    private static ActivityType attribution(OpenVenueRow row, List<ActivityType> requested) {
        List<String> onRow = List.of(row.getActivityTypes().split(","));
        return requested.stream().filter(t -> onRow.contains(t.name())).findFirst().orElse(null);
    }
}
