package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class FoursquareVenueProvider implements VenueProviderPort {

    /**
     * FSQ OS Places kategori kimlikleri. Bilerek EKSIK: yalnizca Plan 2'den devralinan bes tur
     * burada. FSQ taksonomiyi yalnız Observable iframe'inde yayinladigi icin yeni turlerin
     * kimligi dogrulanamiyor; tahmin kimlik hata vermez, sessizce yanlis mekan listeler.
     * Eslenmemis tur Google'a devredilir (bkz. search + ResilientVenueProvider).
     */
    static final Map<ActivityType, String> CATEGORIES = Map.of(
            ActivityType.COFFEE, "13032",
            ActivityType.FOOD, "13065",
            ActivityType.BAR, "13003",
            ActivityType.WALK, "16032",
            ActivityType.ACTIVITY, "10027");

    private static final String SEARCH_URL = "https://places-api.foursquare.com/places/search";
    private static final String API_VERSION = "2025-06-17";
    private static final String FIELDS = "fsq_place_id,name,latitude,longitude,rating,price,photos";

    private final UnirestInstance http;
    private final String apiKey;

    public FoursquareVenueProvider(UnirestInstance http, AppProps props) {
        this.http = http;
        this.apiKey = AppProps.required("FOURSQUARE_API_KEY", props.providers().foursquareKey());
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
        if (!response.isSuccess()) {
            throw new ProviderException("foursquare returned " + response.getStatus());
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
            Double rating = r.has("rating")
                    ? Math.round(r.getDouble("rating") / 2.0 * 10) / 10.0 : null; // 0-10 -> 0-5
            Integer price = r.has("price") ? r.getInt("price") : null;
            String photo = null;
            if (r.has("photos") && r.getJSONArray("photos").length() > 0) {
                JSONObject p = r.getJSONArray("photos").getJSONObject(0);
                photo = p.getString("prefix") + "original" + p.getString("suffix");
            }
            out.add(new VenueCandidate("foursquare", r.getString("fsq_place_id"),
                    r.getString("name"), new GeoPoint(lat, lng), rating, price, photo,
                    "https://maps.google.com/?q=" + lat + "," + lng));
        }
        return out;
    }
}
