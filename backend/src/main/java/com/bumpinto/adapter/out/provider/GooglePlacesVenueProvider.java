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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
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

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesVenueProvider.class);

    private final UnirestInstance http;
    private final String apiKey;
    private final Clock clock;
    private final int monthlyBudget;
    private final int photoMonthlyBudget;
    /**
     * Yerel sayac: Google kota telemetrisi vermez (header yok; Cloud Monitoring gecikmeli ve
     * servis hesabi ister). Yalniz searchNearby sayilir — foto medya cagrilari ayri SKU.
     * Surec ici: pod yeniden basladiginda sifirlanir, ay icinde EKSIK sayabilir (borc).
     */
    private final AtomicReference<YearMonth> period = new AtomicReference<>();
    private final AtomicLong calls = new AtomicLong();
    /** AYRI SKU: foto medya cagrilari searchNearby kotasindan sayilmaz. */
    private final AtomicLong photoCalls = new AtomicLong();

    public GooglePlacesVenueProvider(UnirestInstance http, AppProps props, Clock clock) {
        this.http = http;
        this.apiKey = AppProps.required("GOOGLE_PLACES_API_KEY", props.providers().googleKey());
        this.clock = clock;
        this.monthlyBudget = props.quota().googleMonthlyBudget();
        this.photoMonthlyBudget = props.quota().googlePhotoMonthlyBudget();
    }

    @Override
    public String id() {
        return ID;
    }

    /** Google'in ucretsiz aylik katmani Pasifik takvim ayinda doner (faturalama saati burasi). */
    private static final ZoneId BILLING_ZONE = ZoneId.of("America/Los_Angeles");

    /** Kota = aylik butce − bu ay yapilan arama; ay donunce sayac sifirlanir. */
    @Override
    public ProviderQuota measureQuota() {
        Instant now = clock.instant();
        // Ay siniri UTC DEGIL Pasifik: Google'in faturalama ayi oradan doner, UTC kullansaydik
        // sayac Google'dan saatler once/sonra sifirlanirdi.
        YearMonth month = YearMonth.from(now.atZone(BILLING_ZONE));
        if (!month.equals(period.getAndSet(month))) {
            calls.set(0);
            photoCalls.set(0);
        }
        long used = calls.get();
        return new ProviderQuota(ID, monthlyBudget, Math.max(0, monthlyBudget - used),
                nextMonth(month), now, ProviderQuota.Source.BUDGET);
    }

    private static Instant nextMonth(YearMonth month) {
        return month.plusMonths(1).atDay(1).atStartOfDay(BILLING_ZONE).toInstant();
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        JSONObject body = requestBody(center, radiusKm, type, limit);
        ProviderQuota quota = measureQuota(); // ay donduyse sayaclari sifirlar
        if (quota.remaining() <= 0) {
            // Butce SERT tavandir: istek hic atilmaz, orkestrator siradaki saglayiciya gecer.
            log.info("quota {}: {}/{} (0%) resets {} [{}]", ID, 0L, monthlyBudget,
                    quota.resetAt(), ProviderQuota.Source.BUDGET);
            throw new QuotaExceededException("google nearby monthly budget spent",
                    quota.resetAt());
        }
        calls.incrementAndGet();
        HttpResponse<JsonNode> response = http.post(NEARBY_URL)
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos,"
                                + "places.primaryTypeDisplayName,places.businessStatus,"
                                + "places.shortFormattedAddress,places.userRatingCount,"
                                + "places.regularOpeningHours,places.addressComponents")
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
            JSONObject p = open.get(i);
            JSONObject loc = p.getJSONObject("location");
            String id = p.getString("id");
            String name = p.getJSONObject("displayName").getString("text");
            String mapsUri = p.has("googleMapsUri") ? p.getString("googleMapsUri") : null;
            out.add(new VenueCandidate("google", id, name,
                    new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                    p.has("rating") ? p.getDouble("rating") : null,
                    p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                    photos.get(i), mapsUri,
                    text(p, "primaryTypeDisplayName"),
                    p.has("shortFormattedAddress") ? p.getString("shortFormattedAddress") : null,
                    locality(p),
                    p.has("userRatingCount") ? p.getInt("userRatingCount") : null,
                    hoursToday(p),
                    mapsUri != null ? mapsUri : placeIdLink(id, name)));
        }
        return out;
    }

    /**
     * Her mekanin ILK fotosu icin imzali CDN adresi — {@code places[i]} ile ayni sirada,
     * fotosuz/cozulemeyen/BUTCESI KALMAYAN mekanda {@code null} (istemcide monogram).
     *
     * <p>Neden aramada cozuluyor: {@code searchNearby} dogrudan kullanilabilir bir resim adresi
     * DEGIL yalnizca bir foto referansi dondurur, referansi resme cevirmek API anahtari ister
     * ve anahtar istemciye gecemez. Adres kolonda saklandigi icin tarayici resmi Google
     * CDN'inden TEK istekte ceker; arada kendi ucumuz olsaydi her resim icin fazladan bir
     * gidis-donus olurdu. Adresin omru sinirli — suresi dolarsa kart monograma duser
     * (istemcide img onError).
     */
    private List<String> resolvePhotos(List<JSONObject> places) {
        long remaining = Math.max(0, photoMonthlyBudget - photoCalls.get());
        List<CompletableFuture<String>> pending = new ArrayList<>(places.size());
        boolean consumedThisSearch = false;
        boolean blockedByBudget = false;
        for (JSONObject place : places) {
            if (firstPhotoName(place) == null) {
                pending.add(CompletableFuture.completedFuture(null));
                continue;
            }
            if (remaining <= 0) {
                pending.add(CompletableFuture.completedFuture(null));
                blockedByBudget = true;
                continue;
            }
            remaining--;
            photoCalls.incrementAndGet();
            consumedThisSearch = true;
            pending.add(resolveFirstPhoto(place));
        }
        // Gurultu azaltma: fotosuz aramada (hicbir mekanin fotosu yok) sayac degismez ve
        // butce durumu etkilenmez — bu aramada log YOK.
        if (consumedThisSearch || blockedByBudget) {
            long used = photoCalls.get();
            if (used >= photoMonthlyBudget) {
                log.info("quota google-photos: 0/{} (0%) — venues fall back to monogram",
                        photoMonthlyBudget);
            } else {
                log.info("quota google-photos: {}/{} ({}%)", photoMonthlyBudget - used,
                        photoMonthlyBudget,
                        Math.round((photoMonthlyBudget - used) * 100.0 / photoMonthlyBudget));
            }
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
