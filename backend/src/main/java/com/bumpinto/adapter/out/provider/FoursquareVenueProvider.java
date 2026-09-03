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
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@Order(1) // kota esitliginde birinci: Pro alanlarin ucretsiz payi var
public class FoursquareVenueProvider implements QuotaAwareVenueProvider {

    public static final String ID = "foursquare";

    /**
     * Kredi-429'u ile saatlik-429'u AYRI: kredi bitince {@code x-ratelimit-limit: 0} gelir ve
     * kendiliginden dolmaz (2026-09-02 olcumu). Saatlik limitte header {@code reset} soyler.
     * Kredi icin yenilenme ani bilinmez; gunde bir prob makul.
     */
    static final Duration CREDIT_COOLDOWN = Duration.ofHours(24);

    /**
     * FSQ OS Places kategori kimlikleri. Bilerek EKSIK: yalnizca Plan 2'den devralinan bes tur
     * burada. FSQ taksonomiyi yalnız Observable iframe'inde yayinladigi icin yeni turlerin
     * kimligi dogrulanamiyor; tahmin kimlik hata vermez, sessizce yanlis mekan listeler.
     * Eslenmemis tur Google'a devredilir (bkz. search + ProviderOrchestrator).
     */
    static final Map<ActivityType, String> CATEGORIES = Map.of(
            ActivityType.COFFEE, "13032",
            ActivityType.FOOD, "13065",
            ActivityType.BAR, "13003",
            ActivityType.WALK, "16032",
            ActivityType.ACTIVITY, "10027");

    private static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    private static final String API_VERSION = "2025-06-17";

    /**
     * Pro alanlari (spec §5.A.5, acilis maliyet modeli): `rating`, `price` ve `photos`
     * PREMIUM'du ve her aramayi pahali kiliyordu — cikarildi. Puan/fiyat/foto artik FSQ
     * oturumlarinda NULL'dur; kart "puan yok" haliyle cizilir. `categories` uyum satirini,
     * `location` semt kelimesini, `website` tek dokunusluk cikisi verir.
     */
    private static final String FIELDS =
            "fsq_place_id,name,latitude,longitude,categories,location,website";

    private final UnirestInstance http;
    private final String apiKey;
    private final ProviderQuotaCache quotas;
    private final Clock clock;

    public FoursquareVenueProvider(UnirestInstance http, AppProps props,
                                   ProviderQuotaCache quotas, Clock clock) {
        this.http = http;
        this.apiKey = AppProps.required("FOURSQUARE_API_KEY", props.providers().foursquareKey());
        this.quotas = quotas;
        this.clock = clock;
    }

    @Override
    public String id() {
        return ID;
    }

    /**
     * Kota probu: en ucuz gecerli istek (limit=1, yalniz kimlik alani) — cevap degil,
     * basliklar okunur. UCRETLI bir Pro cagrisidir; scheduler yalniz cache bayatladiginda
     * cagirir, gercek aramalar zaten her yanitta {@link #harvest} ile ayni bilgiyi bedava verir.
     */
    @Override
    public ProviderQuota measureQuota() {
        HttpResponse<JsonNode> response = http.get(SEARCH_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Places-Api-Version", API_VERSION)
                .header("Accept", "application/json")
                .queryString("ll", "0,0")
                .queryString("radius", 100)
                .queryString("limit", 1)
                .queryString("fields", "fsq_place_id")
                .asJson();
        if (response.getStatus() == 429) {
            QuotaExceededException e = classify429(response);
            return ProviderQuota.exhausted(ID, e.resetAt(), clock.instant());
        }
        if (!response.isSuccess()) {
            throw new ProviderException("foursquare probe returned " + response.getStatus());
        }
        return harvest(response, ProviderQuota.Source.PROBE);
    }

    /** {@code x-ratelimit-*} → ProviderQuota; basliklar yoksa (proxy/degisiklik) null. */
    private ProviderQuota harvest(HttpResponse<?> response, ProviderQuota.Source source) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String remaining = response.getHeaders().getFirst("x-ratelimit-remaining");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        if (limit.isEmpty() || remaining.isEmpty()) {
            return null;
        }
        Instant now = clock.instant();
        Instant resetAt = reset.isEmpty() ? now.plus(Duration.ofHours(1))
                : Instant.ofEpochSecond(Long.parseLong(reset));
        return new ProviderQuota(ID, Long.parseLong(limit), Long.parseLong(remaining),
                resetAt, now, source);
    }

    private QuotaExceededException classify429(HttpResponse<?> response) {
        String limit = response.getHeaders().getFirst("x-ratelimit-limit");
        String reset = response.getHeaders().getFirst("x-ratelimit-reset");
        Instant now = clock.instant();
        if ("0".equals(limit) || reset.isEmpty()) {
            return new QuotaExceededException("foursquare credits exhausted",
                    now.plus(CREDIT_COOLDOWN));
        }
        return new QuotaExceededException("foursquare hourly rate limit hit",
                Instant.ofEpochSecond(Long.parseLong(reset)));
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        String category = CATEGORIES.get(type);
        if (category == null) {
            // Kategorisiz arama YAPMA: FSQ o zaman filtresiz sonuc doner ve "sinema" isteyen
            // kullaniciya kafe listeler. Bos donersek Resilient katmani Google'a gecer.
            return List.of();
        }
        HttpResponse<JsonNode> response = http.get(SEARCH_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Places-Api-Version", API_VERSION)
                .header("Accept", "application/json")
                .queryString("ll", center.lat() + "," + center.lng())
                .queryString("radius", (int) Math.min(radiusKm * 1000, 100000))
                .queryString("fsq_category_ids", category)
                .queryString("limit", Math.min(limit, 50))
                .queryString("fields", FIELDS)
                .asJson();
        if (response.getStatus() == 429) {
            throw classify429(response);
        }
        if (!response.isSuccess()) {
            throw new ProviderException("foursquare returned " + response.getStatus());
        }
        // Her gercek yanit kota tasir — scheduler'in ucretli probunu gereksiz kilar.
        ProviderQuota quota = harvest(response, ProviderQuota.Source.HEADER);
        if (quota != null) {
            quotas.record(quota);
        }
        JSONObject root = response.getBody().getObject();
        if (!root.has("results")) {
            return List.of();
        }
        JSONArray results = root.getJSONArray("results");
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < results.length(); i++) {
            JSONObject r = results.getJSONObject(i);
            double lat = r.getDouble("latitude");
            double lng = r.getDouble("longitude");
            String website = r.optString("website", "");
            // Bir kez hesapla: address ve locality AYNI degeri tasir (asagida iki kez kullanilir).
            String locality = locality(r);
            out.add(new VenueCandidate("foursquare", r.getString("fsq_place_id"),
                    r.getString("name"), new GeoPoint(lat, lng),
                    null, null, null,
                    "https://maps.google.com/?q=" + lat + "," + lng,
                    // FSQ tam sokak adresi Premium'da; elimizdeki tek yer kelimesi locality.
                    // address ve locality AYNI degeri tasir — UI ikisini de kart meta'sinda kullanir.
                    firstCategory(r), locality, locality, null, null,
                    website.isBlank() ? null : website));
        }
        return out;
    }

    /**
     * Ilk kategori uyum satirini besler ("Kahve icin: Coffee Shop"). {@code opt*} kullanir:
     * `categories[0]` beklenmedik sekilde skaler/eksik gelirse SADECE bu alan null olur,
     * satirin tamami (ya da sayfanin geri kalani) dusmez.
     */
    private static String firstCategory(JSONObject place) {
        JSONArray categories = place.optJSONArray("categories");
        if (categories == null || categories.isEmpty()) {
            return null;
        }
        JSONObject first = categories.optJSONObject(0);
        if (first == null) {
            return null;
        }
        String name = first.optString("name", "");
        return name.isBlank() ? null : name;
    }

    /**
     * Semt kelimesi: once `locality` (sehir), yoksa ilk `neighborhood`. Sokak adresi
     * ISTEMIYORUZ — kartta yer alan sey "neresi" degil "hangi semt".
     *
     * <p>{@code opt*} kullanir: `location` skaler geldiginde ya da `neighborhood` bir dizi
     * degil de duz metin oldugunda (gozlemlenmis FSQ tutarsizligi) tip uyusmazligi SESSIZCE
     * null'a duser — istisna firlatip tum FSQ sayfasini dusurmez.
     */
    private static String locality(JSONObject place) {
        JSONObject location = place.optJSONObject("location");
        if (location == null) {
            return null;
        }
        String city = location.optString("locality", "");
        if (!city.isBlank()) {
            return city;
        }
        JSONArray neighborhood = location.optJSONArray("neighborhood");
        if (neighborhood == null || neighborhood.isEmpty()) {
            return null;
        }
        String hood = neighborhood.optString(0, "");
        return hood.isBlank() ? null : hood;
    }
}
