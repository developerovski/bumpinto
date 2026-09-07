package com.bumpinto.adapter.out.foursquare;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.QuotaExceededException;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.ProviderQuota;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.TaglineSource;
import com.bumpinto.domain.venue.Taglines;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/** Premium arama: foto, puan, popularite, saat TEK cagrida gelir (spec §5.1). */
@Component
@Order(1)
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.foursquare", name = "enabled", havingValue = "true")
public class FoursquareVenueSource implements VenueSource {

    public static final String ID = "foursquare";

    /** Kredi bitince x-ratelimit-limit: 0 gelir ve kendiliginden dolmaz; gunde bir prob makul. */
    static final Duration CREDIT_COOLDOWN = Duration.ofHours(24);

    private static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    private static final String API_VERSION = "2025-06-17";
    /** Pro alanlari: Sandbox'in 500 ucretsiz cagrisi icinde kalir; foto/puan/saat GELMEZ. */
    static final String PRO_FIELDS = "fsq_place_id,name,latitude,longitude,categories,location,website";
    /** Premium alanlari: ayni cagri $18,75/1k faturalanir, ucretsiz payi yok (2026-09-06 olcumu: 429). */
    static final String PREMIUM_FIELDS = PRO_FIELDS
            + ",hours,rating,price,popularity,photos,closed_bucket,tips";
    private static final String PHOTO_SIZE = "original";

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.foursquare", "https://foursquare.com", 10,
            RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.ANY, ZoneOffset.UTC);

    private final VenueSourceSupport support;
    private final String apiKey;
    private final String fields;
    private final CategoryMapping categories;
    private final Clock clock;

    public FoursquareVenueSource(VenueSourceSupport support, AppProps props,
                                 CategoryMappingLoader loader, Clock clock) {
        this.support = support;
        AppProps.VenueSourceProps config = props.venues().sources().get(ID);
        this.apiKey = config.key();
        this.fields = config.premium() ? PREMIUM_FIELDS : PRO_FIELDS;
        this.categories = loader.load(ID);
        this.clock = clock;
    }

    @Override
    public VenueSourceDescriptor descriptor() {
        return DESCRIPTOR;
    }

    @Override
    public CategoryMapping categories() {
        return categories;
    }

    @Override
    public SearchResult search(SearchRequest request) {
        List<String> ids = categories.idsFor(request.types());
        if (ids.isEmpty()) {
            return SearchResult.empty();
        }
        HttpResponse<JsonNode> response = support.http().get(SEARCH_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Places-Api-Version", API_VERSION)
                .header("Accept", "application/json")
                .queryString("ll", request.center().lat() + "," + request.center().lng())
                .queryString("radius", (int) Math.min(request.radiusKm() * 1000, 100000))
                .queryString("fsq_category_ids", String.join(",", ids))
                .queryString("limit", Math.min(request.limit(), 50))
                .queryString("fields", fields)
                .asJson();
        if (response.getStatus() == 429) {
            throw classify429(response);
        }
        support.requireSuccess(response, ID);
        ProviderQuota quota = support.rateLimitQuota(response, ID, clock);
        JSONObject root = response.getBody() == null ? new JSONObject()
                : response.getBody().getObject();
        if (!root.has("results")) {
            return new SearchResult(List.of(), quota);
        }
        JSONArray results = root.getJSONArray("results");
        List<VenueCandidate> out = new ArrayList<>(results.length());
        for (int i = 0; i < results.length(); i++) {
            JSONObject place = results.getJSONObject(i);
            // Kapali mekan hicbir zaman deste adayi olmaz (spec §4.6).
            if (likelyClosed(place.optString("closed_bucket", ""))) {
                continue;
            }
            out.add(toCandidate(place, request.types()));
        }
        return new SearchResult(out, quota);
    }

    private QuotaExceededException classify429(HttpResponse<?> response) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        Instant now = clock.instant();
        Long resetEpoch = parseLongOrNull(reset);
        if ("0".equals(limit) || resetEpoch == null) {
            return new QuotaExceededException("foursquare credits exhausted", now.plus(CREDIT_COOLDOWN));
        }
        return new QuotaExceededException("foursquare hourly rate limit hit",
                Instant.ofEpochSecond(resetEpoch));
    }

    /** {@code reset} basligi bozuksa parse edilemez sayilir, kredi bitti varsayilir. */
    private static Long parseLongOrNull(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private VenueCandidate toCandidate(JSONObject place, List<ActivityType> requested) {
        JSONObject location = place.optJSONObject("location");
        JSONObject firstCategory = VenueSourceSupport.firstObject(place, "categories");
        JSONObject photo = VenueSourceSupport.firstObject(place, "photos");
        JSONObject hours = place.optJSONObject("hours");
        String category = firstCategory == null ? null : VenueSourceSupport.text(firstCategory, "name");
        Double price = VenueSourceSupport.number(place, "price");
        String tagline = tagline(place);
        return new VenueCandidate(ID, place.getString("fsq_place_id"), place.getString("name"),
                new GeoPoint(place.getDouble("latitude"), place.getDouble("longitude")),
                VenueSourceSupport.number(place, "rating"),
                price == null ? null : price.intValue(),
                photoUrl(photo),
                category,
                location == null ? null : VenueSourceSupport.text(location, "formatted_address"),
                location == null ? null : VenueSourceSupport.text(location, "locality"),
                null,
                hours == null ? null : VenueSourceSupport.text(hours, "display"),
                VenueSourceSupport.text(place, "website"),
                attribution(place, requested),
                VenueSourceSupport.number(place, "popularity"), 10,
                photo == null ? null : VenueSourceSupport.text(photo, "id"),
                tagline, tagline == null ? null : TaglineSource.FSQ);
    }

    /**
     * {@code tips} Premium yanitinda GELMEYEBILIR (anahtar/plan farki): alan yoksa null doner ve
     * kart satiri hic cizilmez. Sozlesme null-TOLERELIDIR — eksik alan hata degildir (§5 risk 4).
     */
    private static String tagline(JSONObject place) {
        JSONArray tips = place.optJSONArray("tips");
        if (tips == null) {
            return null;
        }
        List<String> texts = new ArrayList<>(tips.length());
        for (int i = 0; i < tips.length(); i++) {
            JSONObject tip = tips.optJSONObject(i);
            if (tip != null) {
                texts.add(tip.optString("text", ""));
            }
        }
        return Taglines.fromTips(texts);
    }

    private static String photoUrl(JSONObject photo) {
        if (photo == null) {
            return null;
        }
        String prefix = photo.optString("prefix", "");
        String suffix = photo.optString("suffix", "");
        return prefix.isBlank() || suffix.isBlank() ? null : prefix + PHOTO_SIZE + suffix;
    }

    // Atif yalniz SECILEN turlere: secilmeyen ture dusen mekan deste dengesini bozar.
    private ActivityType attribution(JSONObject place, List<ActivityType> requested) {
        JSONArray list = place.optJSONArray("categories");
        if (list == null) {
            return null;
        }
        List<String> responseIds = new ArrayList<>();
        for (int i = 0; i < list.length(); i++) {
            JSONObject category = list.optJSONObject(i);
            if (category != null) {
                responseIds.add(category.optString("id", ""));
            }
        }
        for (ActivityType type : requested) {
            for (String id : categories.idsFor(List.of(type))) {
                if (responseIds.contains(id)) {
                    return type;
                }
            }
        }
        return null;
    }

    static boolean likelyClosed(String closedBucket) {
        return "LikelyClosed".equals(closedBucket) || "VeryLikelyClosed".equals(closedBucket);
    }
}
