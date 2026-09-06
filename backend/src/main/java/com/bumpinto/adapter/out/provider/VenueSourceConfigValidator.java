package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Spec §3'un bes kurali, ACILISTA. Yanlis yapilandirma calisma aninda "mekan bulunamadi"
 * olarak degil, uygulama hic kalkmayarak bildirilir.
 */
@Component
public class VenueSourceConfigValidator {

    private final Map<String, VenueSource> byId;
    private final AppProps props;

    public VenueSourceConfigValidator(List<VenueSource> sources, AppProps props) {
        this.byId = sources.stream().collect(Collectors.toMap(
                s -> s.descriptor().id(), Function.identity(), (a, b) -> a));
        this.props = props;
    }

    @PostConstruct
    public void validate() {
        String engine = props.map().engine() == null ? "" : props.map().engine();
        for (ActivityType type : ActivityType.values()) {
            List<String> route = props.venues().routeFor(type);
            if (route.isEmpty()) {
                throw new IllegalStateException("bumpinto.venues.route." + type
                        + " is empty: every activity type needs at least one source");
            }
            for (String id : route) {
                VenueSource source = byId.get(id);
                AppProps.VenueSourceProps routedConfig = props.venues().sources().get(id);
                if (source == null || routedConfig == null || !routedConfig.enabled()) {
                    throw new IllegalStateException("bumpinto.venues.route." + type
                            + " points at '" + id + "' which is not an enabled venue source");
                }
                if (!source.categories().covers(List.of(type))) {
                    throw new IllegalStateException("venue-sources/" + id + ".yml does not cover "
                            + type + " but route sends it there");
                }
            }
        }
        byId.values().forEach(source -> {
            VenueSourceDescriptor d = source.descriptor();
            AppProps.VenueSourceProps config = props.venues().sources().get(d.id());
            if (config == null || !config.enabled()) {
                return;
            }
            if (d.requiresKey()) {
                AppProps.required("bumpinto.venues.sources." + d.id() + ".key", config.key());
            }
            if (config.tier() != null && !Set.of("pro", "premium").contains(config.tier().trim().toLowerCase(Locale.ROOT))) {
                throw new IllegalStateException("bumpinto.venues.sources." + d.id()
                        + ".tier must be 'pro' or 'premium' but is '" + config.tier() + "'");
            }
            if (d.requiredMapEngine() != MapEngine.ANY
                    && !d.requiredMapEngine().name().toLowerCase(Locale.ROOT).equals(engine)) {
                throw new IllegalStateException("source '" + d.id() + "' requires bumpinto.map"
                        + ".engine=" + d.requiredMapEngine().name().toLowerCase(Locale.ROOT)
                        + " but it is '" + engine + "'");
            }
        });
    }
}
