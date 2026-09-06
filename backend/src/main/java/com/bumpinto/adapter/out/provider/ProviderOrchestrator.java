package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tur bolme + kume basina SABIT sira + butce eleme + sonuc onbellegi (spec §4).
 * Sira {@code bumpinto.venues.route}'tan gelir ve kotaya BAKMAZ (oran kiyaslamasi 2026-09-06'da
 * ters sonuc verdigi icin kaldirildi).
 */
@Component
@Primary
public class ProviderOrchestrator implements VenueProviderPort {

    private static final Logger log = LoggerFactory.getLogger(ProviderOrchestrator.class);

    /** Yaricap kovalari: 3,1 km ile 4,9 km ayni aramadir. */
    static final double[] RADIUS_BUCKETS = {1, 2, 5, 10, 20, 40};

    private final Map<String, VenueSource> sources;
    private final AppProps props;
    private final ProviderQuotaCache quotas;
    private final BudgetGate budget;
    private final Clock clock;
    private final Cache<String, List<VenueCandidate>> results = Caffeine.newBuilder()
            .maximumSize(1000).expireAfterWrite(Duration.ofMinutes(30)).build();
    /** BOS sonuc AYRI ve KISA omurlu: seyrek bolgede gecici bosluk 30 dk "mekan yok" olmasin. */
    private final Cache<String, Boolean> emptyMarks = Caffeine.newBuilder()
            .maximumSize(1000).expireAfterWrite(Duration.ofMinutes(10)).build();

    public ProviderOrchestrator(List<VenueSource> sources, AppProps props,
                                ProviderQuotaCache quotas, BudgetGate budget, Clock clock) {
        if (sources.isEmpty()) {
            throw new IllegalStateException("no venue source configured");
        }
        this.sources = sources.stream().collect(Collectors.toMap(
                s -> s.descriptor().id(), Function.identity(), (a, b) -> a, LinkedHashMap::new));
        this.props = props;
        this.quotas = quotas;
        this.budget = budget;
        this.clock = clock;
    }

    /** Yaricabi en yakin (yukari) kovaya yuvarlar; en genis kovanin ustunde kalir en genise gider. */
    static double bucketFor(double radiusKm) {
        for (double candidate : RADIUS_BUCKETS) {
            if (radiusKm <= candidate) {
                return candidate;
            }
        }
        return RADIUS_BUCKETS[RADIUS_BUCKETS.length - 1];
    }

    /** 2 ondalik merkez (~1 km) + yaricap kovasi + alfabetik tur kumesi. */
    static String cacheKey(GeoPoint center, double radiusKm, List<ActivityType> types) {
        double bucket = bucketFor(radiusKm);
        String canonical = types.stream().map(ActivityType::name).sorted()
                .collect(Collectors.joining("+"));
        return String.format(Locale.ROOT, "%.2f:%.2f:%.0f:%s",
                center.lat(), center.lng(), bucket, canonical);
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> types, int limit) {
        String key = cacheKey(center, radiusKm, types);
        List<VenueCandidate> cached = results.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        if (Boolean.TRUE.equals(emptyMarks.getIfPresent(key))) {
            return List.of();
        }
        // Anahtar ile istek ayni yaricapi tasir: 2,4 km ve 4,8 km ayni kova, ayni istek.
        double bucketKm = bucketFor(radiusKm);
        Map<String, VenueCandidate> merged = new LinkedHashMap<>();
        boolean degraded = false;
        for (Map.Entry<List<String>, List<ActivityType>> entry : splitByRoute(types).entrySet()) {
            GroupResult groupResult = searchGroup(entry.getKey(), entry.getValue(), center, bucketKm, limit);
            degraded |= groupResult.failed();
            groupResult.candidates().forEach(c -> merged.putIfAbsent(c.provider() + ":" + c.externalId(), c));
        }
        List<VenueCandidate> result = List.copyOf(merged.values());
        // Bozuk (degraded) sonuc onbelleklenmez: geçici hata yuzunden eksik kalmis olabilir.
        if (!degraded) {
            if (result.isEmpty()) {
                emptyMarks.put(key, Boolean.TRUE);
            } else {
                results.put(key, result);
            }
        }
        return result;
    }

    /** Ayni kaynak listesine giden turler TEK istekte birlesir (spec §4.1). */
    Map<List<String>, List<ActivityType>> splitByRoute(List<ActivityType> types) {
        Map<List<String>, List<ActivityType>> groups = new LinkedHashMap<>();
        types.forEach(type -> groups
                .computeIfAbsent(props.venues().routeFor(type), k -> new ArrayList<>())
                .add(type));
        return groups;
    }

    private GroupResult searchGroup(List<String> route, List<ActivityType> types,
                                    GeoPoint center, double radiusKm, int limit) {
        Instant now = clock.instant();
        boolean failed = false;
        for (String id : route) {
            VenueSource source = sources.get(id);
            if (source == null || !source.categories().covers(types)) {
                continue;
            }
            if (quotas.get(id).map(q -> !q.available(now)).orElse(false)
                    || !budget.allows(source.descriptor())) {
                continue;
            }
            try {
                SearchResult result = source.search(new SearchRequest(center, radiusKm, types, limit));
                budget.record(source.descriptor());
                if (result.quota() != null) {
                    quotas.record(result.quota());
                }
                if (!result.candidates().isEmpty()) {
                    log.info("venues from {}: {} results for {} r={}km ({})", id,
                            result.candidates().size(), types, radiusKm, quotaText(id));
                    // Sonuc geldi: onceki kaynak dussun da bu tur toparlanmis sayilir, onbelleklenir.
                    return new GroupResult(result.candidates(), false);
                }
            } catch (QuotaExceededException e) {
                // 429 faturalanabilir: sayaci yine de artir, sonra kaynagi kapat.
                budget.record(source.descriptor());
                quotas.exhaust(id, e.resetAt(), now);
                log.warn("{} quota exhausted until {}: {}", id, e.resetAt(), e.getMessage());
            } catch (RuntimeException e) {
                // Gecici aksaklik: yalniz bu cagri duser, kota ve butce degismez.
                log.warn("{} search failed, trying next source: {}", id, e.getMessage());
                failed = true;
            }
        }
        return new GroupResult(List.of(), failed);
    }

    private String quotaText(String id) {
        return quotas.get(id).map(q -> "quota " + q.remaining() + "/" + q.limit()
                + " [" + q.source() + "]").orElse("quota unknown");
    }

    /** Kume aramasinin sonucu: RuntimeException gorduyse failed=true, onbelleklenmez. */
    private record GroupResult(List<VenueCandidate> candidates, boolean failed) {
    }
}
