package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Gercek FSQ anahtariyla dogrulama (spec §5.1): CATEGORIES.yml'deki kimliklerin canliligi ve
 * premium alanlarin gercek yanitta gelip gelmedigi. Anahtar yoksa atlanir — bu YEREL beklenen
 * sonuctur, CI'da FOURSQUARE_API_KEY tanimlanmadigi surece bu sinif hic calismaz.
 * MALIYET: her kosu ~17 Premium cagri (15 tur + 2) ≈ $0,32 — CI'da degil, yalnizca elle.
 */
@EnabledIfEnvironmentVariable(named = "FOURSQUARE_API_KEY", matches = ".+")
class FoursquarePremiumContractTest {

    static final GeoPoint EINDHOVEN = new GeoPoint(51.4416, 5.4697);

    static FoursquareVenueSource source() {
        UnirestInstance http = Unirest.spawnInstance();
        String key = System.getenv("FOURSQUARE_API_KEY");
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>();
        sources.put("foursquare", new AppProps.VenueSourceProps(true, key, 5000));
        AppProps props = TestProps.of(new AppProps.Venues(sources, TestProps.venues().route()));
        return new FoursquareVenueSource(new VenueSourceSupport(http), props,
                new CategoryMappingLoader(), Clock.systemUTC());
    }

    @Test
    void premiumFieldsArePresentInAtLeastHalfOfTheResults() {
        SearchResult result = source().search(new SearchRequest(EINDHOVEN, 5.0,
                List.of(ActivityType.FOOD), 50));

        assertThat(result.candidates()).isNotEmpty();
        assertThat(result.quota()).isNotNull();

        long withPhoto = result.candidates().stream()
                .filter(c -> c.photoUrl() != null && c.photoUrl().contains("/original/")
                        && c.photoRef() != null && !c.photoRef().isBlank())
                .count();
        assertThat(withPhoto).isGreaterThanOrEqualTo(result.candidates().size() / 2);

        for (VenueCandidate c : result.candidates()) {
            if (c.rating() != null) {
                assertThat(c.rating()).isBetween(0.0, 10.0);
                assertThat(c.ratingScale()).isEqualTo(10);
            }
            if (c.popularity() != null) {
                assertThat(c.popularity()).isBetween(0.0, 1.0);
            }
        }
    }

    @ParameterizedTest
    @EnumSource(ActivityType.class)
    void everyMappedCategoryIdReturnsVenuesTaggedWithThatId(ActivityType type) {
        FoursquareVenueSource source = source();
        List<String> ids = source.categories().idsFor(List.of(type));
        SearchResult result = source.search(new SearchRequest(EINDHOVEN, 40.0, List.of(type), 10));

        assertThat(result.candidates())
                .withFailMessage(() -> type + " icin " + ids + " bos donuyor")
                .isNotEmpty();
        assertThat(result.candidates()).allSatisfy(c -> assertThat(c.activityType()).isEqualTo(type));
    }

    @Test
    void rateLimitHeadersStillArrive() {
        SearchResult result = source().search(new SearchRequest(EINDHOVEN, 2.0,
                List.of(ActivityType.COFFEE), 10));

        assertThat(result.quota()).isNotNull();
        assertThat(result.quota().limit()).isPositive();
        assertThat(result.quota().remaining()).isGreaterThanOrEqualTo(0);
    }
}
