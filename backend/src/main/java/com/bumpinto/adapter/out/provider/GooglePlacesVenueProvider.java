package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Order(2) // kota esitliginde ikinci: tum turleri kapsar, ucretli
public class GooglePlacesVenueProvider implements QuotaAwareVenueProvider {

    public static final String ID = "google";

    /**
     * Bir aktivite birden cok Google turune acilir: includedTypes icindeki turler OR'lanir,
     * yani tek istek daha genis sonuc verir (istek basina 50 ture kadar izinli). Turlerin
     * tamami Places API (New) Table A'dan dogrulandi.
     */
    static final Map<ActivityType, List<String>> TYPES = Map.ofEntries(
            Map.entry(ActivityType.COFFEE, List.of("cafe")),
            Map.entry(ActivityType.FOOD, List.of("restaurant")),
            Map.entry(ActivityType.BAR, List.of("bar")),
            Map.entry(ActivityType.WALK, List.of("park")),
            Map.entry(ActivityType.ACTIVITY, List.of("bowling_alley")),
            Map.entry(ActivityType.SWIM, List.of("swimming_pool", "water_park")),
            Map.entry(ActivityType.HIKE, List.of("hiking_area", "national_park", "state_park")),
            Map.entry(ActivityType.FITNESS, List.of("gym", "fitness_center")),
            Map.entry(ActivityType.CINEMA, List.of("movie_theater")),
            Map.entry(ActivityType.MUSEUM, List.of("museum", "art_museum", "history_museum")),
            Map.entry(ActivityType.ART,
                    List.of("art_gallery", "performing_arts_theater", "cultural_landmark")),
            Map.entry(ActivityType.NIGHTLIFE,
                    List.of("night_club", "karaoke", "live_music_venue")),
            Map.entry(ActivityType.THEME_PARK, List.of("amusement_park", "zoo", "aquarium")),
            Map.entry(ActivityType.ADVENTURE,
                    List.of("adventure_sports_center", "paintball_center", "go_karting_venue")),
            Map.entry(ActivityType.GAMES,
                    List.of("video_arcade", "amusement_center", "miniature_golf_course")));

    private static final String NEARBY_URL =
            "https://places.googleapis.com/v1/places:searchNearby";
    private static final String MEDIA_URL = "https://places.googleapis.com/v1/%s/media";

    /** Deste karti ~500px genisliginde cizilir; retina icin iki kati istenir. */
    private static final int PHOTO_WIDTH_PX = 1000;

    private final UnirestInstance http;
    private final String apiKey;
    private final Clock clock;
    private final int monthlyBudget;
    /**
     * Yerel sayac: Google kota telemetrisi vermez (header yok; Cloud Monitoring gecikmeli ve
     * servis hesabi ister). Yalniz searchNearby sayilir — foto medya cagrilari ayri SKU.
     * Surec ici: pod yeniden basladiginda sifirlanir, ay icinde EKSIK sayabilir (borc).
     */
    private final AtomicReference<YearMonth> period = new AtomicReference<>();
    private final AtomicLong calls = new AtomicLong();

    public GooglePlacesVenueProvider(UnirestInstance http, AppProps props, Clock clock) {
        this.http = http;
        this.apiKey = AppProps.required("GOOGLE_PLACES_API_KEY", props.providers().googleKey());
        this.clock = clock;
        this.monthlyBudget = props.quota().googleMonthlyBudget();
    }

    @Override
    public String id() {
        return ID;
    }

    /** Kota = aylik butce − bu ay yapilan arama; ay donunce sayac sifirlanir. */
    @Override
    public ProviderQuota measureQuota() {
        Instant now = clock.instant();
        YearMonth month = YearMonth.from(now.atZone(ZoneOffset.UTC));
        if (!month.equals(period.getAndSet(month))) {
            calls.set(0);
        }
        long used = calls.get();
        return new ProviderQuota(ID, monthlyBudget, Math.max(0, monthlyBudget - used),
                nextMonth(month), now, ProviderQuota.Source.BUDGET);
    }

    private static Instant nextMonth(YearMonth month) {
        return month.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        JSONObject body = requestBody(center, radiusKm, type, limit);
        measureQuota(); // ay donduyse sayaci sifirlar
        calls.incrementAndGet();
        HttpResponse<JsonNode> response = http.post(NEARBY_URL)
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos")
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
        if (!response.isSuccess()) {
            throw new ProviderException("google places returned " + response.getStatus());
        }
        JSONObject root = response.getBody().getObject();
        if (!root.has("places")) {
            return List.of();
        }
        JSONArray places = root.getJSONArray("places");
        // Foto adresleri ONCE toplu cozulur: her mekan icin ayri bir medya cagrisi gerekiyor,
        // seri gitseydi 20 mekanlik aramaya birkac saniye eklerdi.
        List<String> photos = resolvePhotos(places);
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < places.length(); i++) {
            JSONObject p = places.getJSONObject(i);
            JSONObject loc = p.getJSONObject("location");
            out.add(new VenueCandidate("google", p.getString("id"),
                    p.getJSONObject("displayName").getString("text"),
                    new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                    p.has("rating") ? p.getDouble("rating") : null,
                    p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                    photos.get(i),
                    p.has("googleMapsUri") ? p.getString("googleMapsUri") : null));
        }
        return out;
    }

    /**
     * Her mekanin ILK fotosu icin imzali CDN adresi — {@code places[i]} ile ayni sirada,
     * fotosuz/cozulemeyen mekanda {@code null}.
     *
     * <p>Neden aramada cozuluyor: {@code searchNearby} dogrudan kullanilabilir bir resim adresi
     * DEGIL yalnizca bir foto referansi dondurur, referansi resme cevirmek API anahtari ister
     * ve anahtar istemciye gecemez. Adres kolonda saklandigi icin tarayici resmi Google
     * CDN'inden TEK istekte ceker; arada kendi ucumuz olsaydi her resim icin fazladan bir
     * gidis-donus olurdu. Adresin omru sinirli — suresi dolarsa kart monograma duser
     * (istemcide img onError).
     */
    private List<String> resolvePhotos(JSONArray places) {
        List<CompletableFuture<String>> pending = new ArrayList<>(places.length());
        for (int i = 0; i < places.length(); i++) {
            pending.add(resolveFirstPhoto(places.getJSONObject(i)));
        }
        return pending.stream().map(CompletableFuture::join).toList();
    }

    private CompletableFuture<String> resolveFirstPhoto(JSONObject place) {
        String name = firstPhotoName(place);
        if (name == null) {
            return CompletableFuture.completedFuture(null);
        }
        return http.get(String.format(Locale.ROOT, MEDIA_URL, name))
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
     * Ayri metot: includedTypes'in DUZ bir dize dizisi olmasi gerekiyor. {@code put(List)}
     * yazilirsa ic ice dizi ({@code [["a","b"]]}) gider — Google bunu 400 ile degil, sessizce
     * filtresiz sonuc dondurerek karsilar. Testin dogrudan tutabilmesi icin ayrildi.
     */
    static JSONObject requestBody(GeoPoint center, double radiusKm, ActivityType type, int limit) {
        List<String> includedTypes = TYPES.get(type);
        if (includedTypes == null) {
            throw new ProviderException("no google type mapping for " + type);
        }
        JSONArray types = new JSONArray();
        includedTypes.forEach(types::put);
        return new JSONObject()
                .put("includedTypes", types)
                .put("maxResultCount", Math.min(limit, 20))
                .put("locationRestriction", new JSONObject().put("circle", new JSONObject()
                        .put("center", new JSONObject()
                                .put("latitude", center.lat()).put("longitude", center.lng()))
                        .put("radius", Math.min(radiusKm * 1000, 50000))));
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
