package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VenueSourceConfigValidatorTest {

    static VenueSource source(String id, boolean requiresKey, MapEngine engine,
                              List<ActivityType> covered) {
        Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
        covered.forEach(t -> byType.put(t, List.of(t.name().toLowerCase(Locale.ROOT))));
        VenueSourceDescriptor d = new VenueSourceDescriptor(id, "attribution." + id, null, null,
                RetentionRule.KEEP, requiresKey, engine, ZoneOffset.UTC);
        return new VenueSource() {
            @Override public VenueSourceDescriptor descriptor() { return d; }
            @Override public CategoryMapping categories() { return new CategoryMapping(byType); }
            @Override public SearchResult search(SearchRequest r) { return SearchResult.empty(); }
        };
    }

    static VenueSource open() {
        return source("open", false, MapEngine.ANY, List.of(ActivityType.values()));
    }

    static VenueSource foursquare(ActivityType... covered) {
        return source("foursquare", true, MapEngine.ANY, List.of(covered));
    }

    static void validate(List<VenueSource> sources, AppProps props) {
        new VenueSourceConfigValidator(sources, props).validate();
    }

    /** TestProps.venues() rotasi COFFEE/FOOD/BAR/NIGHTLIFE'i foursquare'e yollar; withRoute()
     * tek bir turu degistirir, digerleri hala calisan bir foursquare kaynagi ister. */
    static List<VenueSource> baseSources() {
        return List.of(foursquare(ActivityType.COFFEE, ActivityType.FOOD, ActivityType.BAR,
                ActivityType.NIGHTLIFE), open());
    }

    static AppProps.Venues withRoute(ActivityType type, String value) {
        Map<ActivityType, String> route = new LinkedHashMap<>(TestProps.venues().route());
        route.put(type, value);
        return new AppProps.Venues(TestProps.venues().sources(), route);
    }

    @Test
    void acceptsTheShippedConfiguration() {
        assertThatCode(() -> validate(List.of(foursquare(ActivityType.COFFEE, ActivityType.FOOD,
                ActivityType.BAR, ActivityType.NIGHTLIFE), open()), TestProps.defaults()))
                .doesNotThrowAnyException();
    }

    /** (a) yonlendirmedeki her id ENABLED bir kaynak olmali. */
    @Test
    void rejectsRouteToUnknownSource() {
        assertThatThrownBy(() -> validate(baseSources(),
                TestProps.of(withRoute(ActivityType.SWIM, "tripadvisor,open"))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("tripadvisor");
    }

    /** (b) her ActivityType icin en az bir kaynak. */
    @Test
    void rejectsTypeWithoutAnySource() {
        assertThatThrownBy(() -> validate(baseSources(),
                TestProps.of(withRoute(ActivityType.GAMES, ""))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("GAMES");
    }

    /** (c) yonlendirilen kaynagin YAML'i o turu kapsamali. */
    @Test
    void rejectsSourceThatDoesNotCoverItsRoutedType() {
        assertThatThrownBy(() -> validate(List.of(foursquare(ActivityType.COFFEE), open()),
                TestProps.defaults()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("foursquare").hasMessageContaining("FOOD");
    }

    /** (d) google acilirsa harita motoru google olmali (Places ToS). Kural (a) icin google
     * burada ETKIN olmali, yoksa "not an enabled venue source" (a) bu testi (d)'den once keser. */
    @Test
    void rejectsGoogleSourceWhileMapEngineIsMaplibre() {
        VenueSource google = source("google", true, MapEngine.GOOGLE, List.of(ActivityType.values()));
        List<VenueSource> sources = new ArrayList<>(baseSources());
        sources.add(google);
        Map<String, AppProps.VenueSourceProps> enabledGoogle =
                new LinkedHashMap<>(TestProps.venues().sources());
        enabledGoogle.put("google", new AppProps.VenueSourceProps(true, "g-key", 1000));
        AppProps.Venues venues = new AppProps.Venues(enabledGoogle,
                withRoute(ActivityType.SWIM, "google").route());
        assertThatThrownBy(() -> validate(sources, TestProps.of(venues)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("map.engine");
    }

    /** (e) requiresKey ve anahtar bos -> hata (AppProps.required deseni). */
    @Test
    void rejectsMissingKeyForSourceThatNeedsOne() {
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>(TestProps.venues().sources());
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "", 5000));
        assertThatThrownBy(() -> validate(List.of(foursquare(ActivityType.COFFEE, ActivityType.FOOD,
                ActivityType.BAR, ActivityType.NIGHTLIFE), open()),
                TestProps.of(new AppProps.Venues(sources, TestProps.venues().route()))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("foursquare");
    }
}
