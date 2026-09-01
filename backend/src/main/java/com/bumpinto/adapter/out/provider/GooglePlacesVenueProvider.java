package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.AppProps;
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
public class GooglePlacesVenueProvider implements VenueProviderPort {

    static final Map<ActivityType, String> TYPES = Map.of(
            ActivityType.COFFEE, "cafe",
            ActivityType.FOOD, "restaurant",
            ActivityType.BAR, "bar",
            ActivityType.WALK, "park",
            ActivityType.ACTIVITY, "bowling_alley");

    private static final String NEARBY_URL =
            "https://places.googleapis.com/v1/places:searchNearby";

    private final UnirestInstance http;
    private final String apiKey;

    public GooglePlacesVenueProvider(UnirestInstance http, AppProps props) {
        this.http = http;
        this.apiKey = AppProps.required("GOOGLE_PLACES_API_KEY", props.providers().googleKey());
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        JSONObject body = new JSONObject()
                .put("includedTypes", new JSONArray().put(TYPES.get(type)))
                .put("maxResultCount", Math.min(limit, 20))
                .put("locationRestriction", new JSONObject().put("circle", new JSONObject()
                        .put("center", new JSONObject()
                                .put("latitude", center.lat()).put("longitude", center.lng()))
                        .put("radius", Math.min(radiusKm * 1000, 50000))));
        HttpResponse<JsonNode> response = http.post(NEARBY_URL)
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri")
                .body(body.toString())
                .asJson();
        if (!response.isSuccess()) {
            throw new ProviderException("google places returned " + response.getStatus());
        }
        JSONObject root = response.getBody().getObject();
        if (!root.has("places")) {
            return List.of();
        }
        JSONArray places = root.getJSONArray("places");
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < places.length(); i++) {
            JSONObject p = places.getJSONObject(i);
            JSONObject loc = p.getJSONObject("location");
            out.add(new VenueCandidate("google", p.getString("id"),
                    p.getJSONObject("displayName").getString("text"),
                    new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                    p.has("rating") ? p.getDouble("rating") : null,
                    p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                    null, // foto FSQ'dan gelir; Google yedeginde foto yok (bilinen taviz)
                    p.has("googleMapsUri") ? p.getString("googleMapsUri") : null));
        }
        return out;
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
