package com.bumpinto.adapter.out.routing;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.RoutingPort;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/** OSRM /table: NxM sure matrisi tek istekte. Profil basina base URL; bos = kapali. 1 sn'de cevap yoksa bos doner. */
@Component
public class OsrmRouting implements RoutingPort {

    private static final Logger log = LoggerFactory.getLogger(OsrmRouting.class);
    private static final int TIMEOUT_MS = 1000;

    private final UnirestInstance http;
    private final AppProps.Routing.Osrm urls;
    // Poll basina canli OSRM cagrisi yok: 60 sn onbellek + 60 sn geri cekilme (inceleme 2026-09-06).
    private final Cache<String, Optional<int[][]>> results = Caffeine.newBuilder()
            .maximumSize(500).expireAfterWrite(Duration.ofSeconds(60)).build();
    private final Cache<String, Boolean> down = Caffeine.newBuilder()
            .maximumSize(10).expireAfterWrite(Duration.ofSeconds(60)).build();

    public OsrmRouting(UnirestInstance http, AppProps props) {
        this.http = http;
        this.urls = props.routing().osrm();
    }

    @Override
    public Optional<int[][]> durationsSeconds(List<GeoPoint> sources, List<GeoPoint> destinations, TravelMode mode) {
        String base = baseUrlOf(mode);
        if (base == null || base.isBlank() || sources.isEmpty() || destinations.isEmpty()) {
            return Optional.empty();
        }
        String profile = profile(mode);
        if (Boolean.TRUE.equals(down.getIfPresent(profile))) {
            return Optional.empty();
        }
        // OSRM koordinat sirasi lng,lat; kaynaklar once, hedefler sonra tek listede.
        String coordinates = Stream.concat(sources.stream(), destinations.stream())
                .map(p -> String.format(Locale.ROOT, "%s,%s", p.lng(), p.lat()))
                .collect(Collectors.joining(";"));
        String sourcesIdx = indexes(0, sources.size());
        String destIdx = indexes(sources.size(), destinations.size());
        String cacheKey = profile + "|" + coordinates + "|" + sourcesIdx + "|" + destIdx;
        Optional<int[][]> cached = results.getIfPresent(cacheKey);
        if (cached != null) {
            return cached;
        }
        Optional<int[][]> result = fetch(base, profile, coordinates, sourcesIdx, destIdx,
                sources.size(), destinations.size());
        results.put(cacheKey, result);
        return result;
    }

    private Optional<int[][]> fetch(String base, String profile, String coordinates, String sourcesIdx,
                                    String destIdx, int sourceCount, int destCount) {
        try {
            HttpResponse<JsonNode> response = http.get(base.replaceAll("/+$", "") + "/table/v1/" + profile + "/" + coordinates)
                    .queryString("sources", sourcesIdx)
                    .queryString("destinations", destIdx)
                    .queryString("annotations", "duration")
                    .requestTimeout(TIMEOUT_MS)
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                log.warn("osrm {} returned {}", profile, response.getStatus());
                down.put(profile, true);
                return Optional.empty();
            }
            JSONArray rows = response.getBody().getObject().optJSONArray("durations");
            if (rows == null || rows.length() != sourceCount) {
                return Optional.empty();
            }
            int[][] matrix = new int[sourceCount][destCount];
            for (int r = 0; r < rows.length(); r++) {
                JSONArray row = rows.getJSONArray(r);
                for (int c = 0; c < destCount; c++) {
                    // null = ulasilamaz; -1 ile isaretlenir, cagiran tahmine duser.
                    matrix[r][c] = row.isNull(c) ? -1 : (int) Math.round(row.getDouble(c));
                }
            }
            return Optional.of(matrix);
        } catch (RuntimeException e) {
            log.warn("osrm {} failed: {}", profile, e.getMessage());
            down.put(profile, true);
            return Optional.empty();
        }
    }

    private static String indexes(int from, int count) {
        return IntStream.range(from, from + count).mapToObj(Integer::toString).collect(Collectors.joining(";"));
    }

    private static String profile(TravelMode mode) {
        return switch (mode) {
            case CAR -> "car";
            case BIKE, EBIKE -> "bicycle";
            default -> "foot";
        };
    }

    private String baseUrlOf(TravelMode mode) {
        return switch (mode) {
            case CAR -> urls.car();
            case BIKE, EBIKE -> urls.bicycle();
            case WALK -> urls.foot();
            case TRANSIT -> null;
        };
    }
}
