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
     * FSQ kategori kimlikleri — 24 HANELI kimlikler, 5 haneli taksonomi kodlari DEGIL.
     * {@code places-api.foursquare.com} 5 haneli kodu (eski {@code 13032} vb.) reddediyor:
     * {@code HTTP 400 "fsq_category_ids: invalid id"}. Kod eski kodlarla kaldigi icin her
     * COFFEE/FOOD/BAR/WALK/ACTIVITY aramasi 400 aliyordu; Google da ayni anda 403 verince
     * orkestrator son hatayi yukari atiyor ve "Mekanlari bul" 500 donuyordu.
     *
     * <p>Bes kimligin BESI de gercek istekle dogrulandi (2026-09-06, ll=51.8,4.85 r=25km):
     * her biri 200 dondu ve yanittaki {@code categories} adlari beklenen turu gosterdi.
     * Ust duzey kimlik alt turleri de kapsar (Park -> National Park, Bar -> Wine Bar).
     * KOSULLU dogrulama sart: gecersiz kimlik artik 400 verir ama GECERLI-AMA-YANLIS kimlik
     * 200 ile sessizce yanlis mekan listeler.
     *
     * <p>COFFEE icin "Café" DEGIL "Coffee Shop": Hollandaca'da café bir bruin kafe/bardir,
     * o kimlik COFFEE'yi BAR'a bulastiriyordu (olcumde Stadscafé, Wine Bar dondu).
     *
     * <p>FOOD icin ust duzey "Food": ozel "Restaurant" kimligi ({@code ...1c4941735}) olcumde
     * BOS dondu — mekanlar mutfak alt turleriyle etiketli ve o kimlik onlari toplamiyor.
     *
     * <p>Bilerek EKSIK: yalnizca Plan 2'den devralinan bes tur burada.
     * Eslenmemis tur Google'a devredilir (bkz. search + ProviderOrchestrator).
     */
    static final Map<ActivityType, String> CATEGORIES = Map.of(
            ActivityType.COFFEE, "4bf58dd8d48988d1e0931735",
            ActivityType.FOOD, "4d4b7105d754a06374d81259",
            ActivityType.BAR, "4bf58dd8d48988d116941735",
            ActivityType.WALK, "4bf58dd8d48988d163941735",
            ActivityType.ACTIVITY, "4bf58dd8d48988d1e4931735");

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

    // Kota PROBU YOK (bilincli): eski surumde limit=1'lik "sadece basliklari oku" istegi vardi
    // ve scheduler onu 5 dakikada bir atiyordu — ucretli bir Pro cagrisi, bos duran surecte
    // bile gunde ~288 istek. Ayni basliklar zaten her GERCEK aramanin yanitinda geliyor;
    // bkz. search icindeki harvest cagrisi.

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

    /**
     * Secili aktivitelerin HEPSI eslenmisse virgullu kategori dizesi, biri bile eksikse null.
     * KISMI kapsama kabul edilmez: orkestrator "ilk dolu sonuc kazanir" kuralini isletir,
     * yani eksik kapsamayla donen dolu bir liste Google'i devre disi birakir ve kullanici
     * sectigi bir ilgi alanindan hic mekan gormez.
     */
    static String categoryIds(List<ActivityType> selected) {
        StringBuilder joined = new StringBuilder();
        for (ActivityType type : selected) {
            String id = CATEGORIES.get(type);
            if (id == null) {
                return null;
            }
            if (!joined.isEmpty()) {
                joined.append(',');
            }
            joined.append(id);
        }
        return joined.isEmpty() ? null : joined.toString();
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> selected, int limit) {
        String category = categoryIds(selected);
        if (category == null) {
            // Kategorisiz ya da EKSIK kategoriyle arama YAPMA: FSQ filtresiz sonuc doner ya da
            // secimin bir kismini servis eder. Bos donersek orkestrator Google'a gecer.
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
                    website.isBlank() ? null : website,
                    // Atif ancak tek aktivite secildiginde kesindir. Coklu secimde null:
                    // yanittan yalniz kategori ADINI okuyoruz, CATEGORIES ise ust duzey id
                    // tutuyor — ad uzerinden geri esleme guvenilir degil, uydurma atif ise
                    // kartta yanlis rozet gosterir.
                    selected.size() == 1 ? selected.get(0) : null));
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
