package com.bumpinto.adapter.out.google;

import com.bumpinto.adapter.out.provider.CategoryMappingLoader;
import com.bumpinto.adapter.out.provider.QuotaExceededException;
import com.bumpinto.adapter.out.provider.VenueSourceSupport;
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
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

// Butce ve sayac BudgetGate'te (T2). Google inaktif: acilirsa foto cozumu once kisa listeye
// indirilmeli (spec §5.4).
@Component
@Order(3)
@ConditionalOnProperty(prefix = "bumpinto.venues.sources.google", name = "enabled", havingValue = "true")
public class GooglePlacesVenueSource implements VenueSource {

    public static final String ID = "google";

    private static final VenueSourceDescriptor DESCRIPTOR = new VenueSourceDescriptor(
            ID, "attribution.google", "https://www.google.com/maps", 5,
            RetentionRule.STRIP_AT_EXPIRY, true, MapEngine.GOOGLE, ZoneId.of("America/Los_Angeles"));

    private static final String NEARBY_URL =
            "https://places.googleapis.com/v1/places:searchNearby";
    private static final String MEDIA_URL = "https://places.googleapis.com/v1/%s/media";

    /** Deste karti ~500px genisliginde cizilir; retina icin iki kati istenir. */
    private static final int PHOTO_WIDTH_PX = 1000;

    private final VenueSourceSupport support;
    private final String apiKey;
    private final CategoryMapping categories;
    private final Clock clock;

    public GooglePlacesVenueSource(VenueSourceSupport support, AppProps props,
                                   CategoryMappingLoader loader, Clock clock) {
        this.support = support;
        this.apiKey = props.venues().sources().get(ID).key();
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
        JSONObject body = requestBody(request, ids);
        HttpResponse<JsonNode> response = support.http().post(NEARBY_URL)
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos,"
                                + "places.primaryTypeDisplayName,places.businessStatus,"
                                + "places.shortFormattedAddress,places.userRatingCount,"
                                + "places.regularOpeningHours,places.addressComponents,"
                                + "places.primaryType,places.types")
                .body(body.toString())
                .asJson();
        if (response.getStatus() == 429) {
            // Google yenilenme anini soylemez; gunluk kota gece yarisi (Pasifik) doner,
            // aylik butce ay basinda. Tahmin: bir sonraki UTC gun basi.
            Instant now = clock.instant();
            throw new QuotaExceededException("google places quota exhausted",
                    now.atZone(ZoneOffset.UTC).toLocalDate().plusDays(1)
                            .atStartOfDay(ZoneOffset.UTC).toInstant());
        }
        support.requireSuccess(response, ID);
        JSONObject root = response.getBody() == null ? new JSONObject()
                : response.getBody().getObject();
        if (!root.has("places")) {
            return new SearchResult(List.of(), null);
        }
        JSONArray places = root.getJSONArray("places");
        // businessStatus OPERATIONAL degilse mekan SESSIZCE elenir (spec §5.A.5): kapanmis
        // bir kafeyi listelemek urunun tek isini — bulusmayi — bozar. Alan yoksa kabul edilir.
        List<JSONObject> open = new ArrayList<>(places.length());
        for (int i = 0; i < places.length(); i++) {
            JSONObject p = places.getJSONObject(i);
            String status = p.optString("businessStatus", "OPERATIONAL");
            if ("OPERATIONAL".equals(status)) {
                open.add(p);
            }
        }
        // Foto adresleri ONCE toplu cozulur: her mekan icin ayri bir medya cagrisi gerekiyor,
        // seri gitseydi 20 mekanlik aramaya birkac saniye eklerdi.
        List<String> photos = resolvePhotos(open);
        List<VenueCandidate> out = new ArrayList<>(open.size());
        for (int i = 0; i < open.size(); i++) {
            out.add(toCandidate(open.get(i), photos.get(i), request.types()));
        }
        return new SearchResult(out, null);
    }

    /**
     * Ayri metot: includedTypes'in DUZ bir dize dizisi olmasi gerekiyor. {@code put(List)}
     * yazilirsa ic ice dizi ({@code [["a","b"]]}) gider — Google bunu 400 ile degil, sessizce
     * filtresiz sonuc dondurerek karsilar.
     */
    static JSONObject requestBody(SearchRequest request, List<String> ids) {
        JSONArray types = new JSONArray();
        ids.forEach(types::put);
        return new JSONObject()
                .put("includedTypes", types)
                // MESAFE, populariteden farkli olarak seyrek turu (hiking_area, museum)
                // 20'lik tavanin disina itmez; orta nokta urununde dogru egilim de budur.
                .put("rankPreference", "DISTANCE")
                .put("maxResultCount", Math.min(request.limit(), 20))
                .put("locationRestriction", new JSONObject().put("circle", new JSONObject()
                        .put("center", new JSONObject()
                                .put("latitude", request.center().lat())
                                .put("longitude", request.center().lng()))
                        .put("radius", Math.min(request.radiusKm() * 1000, 50000))));
    }

    private VenueCandidate toCandidate(JSONObject p, String photoUrl, List<ActivityType> requested) {
        JSONObject loc = p.getJSONObject("location");
        String id = p.getString("id");
        String name = p.getJSONObject("displayName").getString("text");
        String mapsUri = p.has("googleMapsUri") ? p.getString("googleMapsUri") : null;
        return new VenueCandidate(ID, id, name,
                new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                p.has("rating") ? p.getDouble("rating") : null,
                p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                photoUrl,
                text(p, "primaryTypeDisplayName"),
                p.has("shortFormattedAddress") ? p.getString("shortFormattedAddress") : null,
                locality(p),
                p.has("userRatingCount") ? p.getInt("userRatingCount") : null,
                hoursToday(p),
                mapsUri != null ? mapsUri : placeIdLink(id, name),
                attribute(p, requested),
                null, // popularity: Google vermez
                5,
                firstPhotoName(p));
    }

    /**
     * Her mekanin ILK fotosu icin imzali CDN adresi — {@code places[i]} ile ayni sirada,
     * fotosuz/cozulemeyen mekanda {@code null} (istemcide monogram).
     */
    private List<String> resolvePhotos(List<JSONObject> places) {
        List<CompletableFuture<String>> pending = new ArrayList<>(places.size());
        for (JSONObject place : places) {
            pending.add(resolveFirstPhoto(place));
        }
        return pending.stream().map(CompletableFuture::join).toList();
    }

    private CompletableFuture<String> resolveFirstPhoto(JSONObject place) {
        String name = firstPhotoName(place);
        if (name == null) {
            return CompletableFuture.completedFuture(null);
        }
        return support.http().get(String.format(Locale.ROOT, MEDIA_URL, name))
                .header("X-Goog-Api-Key", apiKey)
                .queryString("maxWidthPx", PHOTO_WIDTH_PX)
                .queryString("skipHttpRedirect", "true")
                .asJsonAsync()
                // Foto hatasi ARAMAYI DUSURMEZ: silinmis referans olagandir, o mekan fotosuz
                // kalir. Aksi halde tek bozuk foto tum destenin kurulmasini engellerdi.
                .handle((r, error) -> error != null || !r.isSuccess() || r.getBody() == null
                        ? null
                        : r.getBody().getObject().optString("photoUri", null));
    }

    /** @return {@code places/<id>/photos/<ref>}, foto yoksa null. */
    static String firstPhotoName(JSONObject place) {
        if (!place.has("photos") || place.getJSONArray("photos").isEmpty()) {
            return null;
        }
        String name = place.getJSONArray("photos").getJSONObject(0).optString("name", "");
        return name.isBlank() ? null : name;
    }

    /**
     * Yanit hangi mekanin hangi ilgi alanindan geldigini soylemez -- turlerden geri kurulur.
     * Once {@code primaryType} (mekanin kendi baskin turu), sonra {@code types} icinde
     * KULLANICININ SECIM SIRASINA gore ilk eslesme. Eslesme yalniz {@code requested} icinde
     * aranir: secilmeyen bir ture atif uydurulmaz, hicbiri tutmazsa null.
     */
    private ActivityType attribute(JSONObject place, List<ActivityType> requested) {
        String primary = place.optString("primaryType", "");
        for (ActivityType type : requested) {
            if (categories.idsFor(List.of(type)).contains(primary)) {
                return type;
            }
        }
        JSONArray types = place.optJSONArray("types");
        if (types == null) {
            return null;
        }
        for (ActivityType type : requested) {
            List<String> mapped = categories.idsFor(List.of(type));
            for (int i = 0; i < types.length(); i++) {
                if (mapped.contains(types.optString(i, ""))) {
                    return type;
                }
            }
        }
        return null;
    }

    /** {"text": "..."} sarmalayicili Google alanlari (displayName, primaryTypeDisplayName). */
    private static String text(JSONObject place, String field) {
        if (!place.has(field)) {
            return null;
        }
        String value = place.getJSONObject(field).optString("text", "");
        return value.isBlank() ? null : value;
    }

    /**
     * Kasaba/semt kelimesi: {@code addressComponents} icinde {@code locality} tipini arar,
     * yoksa {@code sublocality}. Kart meta satirinda TAM adres degil bu kelime yazilir
     * (spec §4.9); tam adres {@code shortFormattedAddress} olarak ayrica tasinir.
     */
    static String locality(JSONObject place) {
        if (!place.has("addressComponents")) {
            return null;
        }
        JSONArray components = place.getJSONArray("addressComponents");
        String sublocality = null;
        for (int i = 0; i < components.length(); i++) {
            JSONObject component = components.getJSONObject(i);
            if (!component.has("types")) {
                continue;
            }
            JSONArray types = component.getJSONArray("types");
            String name = component.optString("longText", "");
            if (name.isBlank()) {
                continue;
            }
            for (int t = 0; t < types.length(); t++) {
                String type = types.getString(t);
                if ("locality".equals(type)) {
                    return name;
                }
                if (sublocality == null && type.startsWith("sublocality")) {
                    sublocality = name;
                }
            }
        }
        return sublocality;
    }

    /**
     * weekdayDescriptions genelde PAZARTESI ile baslar (Places API New) ama Google'in kendi
     * dokumani sirayi DIL BAGIMLI sayiyor — sabit index kirilgan. Once bugunun Ingilizce gun
     * adiyla ESLESEN satiri ariyoruz (guvenilir); hicbiri eslesmezse (beklenmeyen dil/bicim)
     * Pazartesi-ilk varsayimina duseriz — hic satir donmemekten iyi.
     */
    private String hoursToday(JSONObject place) {
        if (!place.has("regularOpeningHours")) {
            return null;
        }
        JSONObject hours = place.getJSONObject("regularOpeningHours");
        if (!hours.has("weekdayDescriptions")) {
            return null;
        }
        JSONArray descriptions = hours.getJSONArray("weekdayDescriptions");
        String todayName = clock.instant().atZone(ZoneOffset.UTC).getDayOfWeek()
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        for (int i = 0; i < descriptions.length(); i++) {
            String value = descriptions.getString(i);
            if (value.startsWith(todayName)) {
                return value.isBlank() ? null : value;
            }
        }
        int index = clock.instant().atZone(ZoneOffset.UTC).getDayOfWeek().getValue() - 1;
        if (index < 0 || index >= descriptions.length()) {
            return null;
        }
        String value = descriptions.getString(index);
        return value.isBlank() ? null : value;
    }

    /**
     * API'siz, kalici Maps baglantisi. Place ID SURESIZ saklanabilir (Google Service Terms),
     * bu yuzden bu adres bir onbellek ihlali degildir.
     */
    static String placeIdLink(String placeId, String name) {
        return "https://www.google.com/maps/search/?api=1&query="
                + URLEncoder.encode(name, StandardCharsets.UTF_8)
                + "&query_place_id=" + URLEncoder.encode(placeId, StandardCharsets.UTF_8);
    }

    private static Integer priceLevel(String level) {
        return switch (level) {
            case "PRICE_LEVEL_FREE" -> 0;
            case "PRICE_LEVEL_INEXPENSIVE" -> 1;
            case "PRICE_LEVEL_MODERATE" -> 2;
            case "PRICE_LEVEL_EXPENSIVE" -> 3;
            case "PRICE_LEVEL_VERY_EXPENSIVE" -> 4;
            default -> null;
        };
    }
}
