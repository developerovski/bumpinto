package com.bumpinto.adapter.out.geocode;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.GeocodeBusyException;
import com.bumpinto.domain.geo.GeoResult;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.port.GeocodePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.Semaphore;

/**
 * Orta noktanin kasaba/semt kelimesi (spec §5.A.4) + metinden koordinat (ileri geocode).
 * Politika geregi (bkz. {@link AppProps.Geocode}): iletisim adresli User-Agent, saniyede <=1
 * istek, sonuc onbellekli. {@code zoom=10} kasaba duzeyidir — sokak adresi ISTEMIYORUZ, hem
 * gereksiz hem gizlilik acisindan fazla.
 *
 * <p>Onbellek anahtari YUVARLANMIS konumdur (~1 km): ayni sehirdeki iki oturum tek istek eder,
 * ve tam koordinat hicbir zaman ucuncu tarafa gitmez.
 *
 * <p>Atif borcu: bu veriyi gosteren her yuzeyde "© OpenStreetMap contributors" (W-6a.9).
 */
@Component
public class NominatimGeocoder implements ReverseGeocodePort, GeocodePort {

    private static final Logger log = LoggerFactory.getLogger(NominatimGeocoder.class);
    private static final String APP_VERSION = "0.1";
    /** Nominatim adres anahtarlari kaba→ince degil, YER TURUNE gore gelir; ilk dolan kazanir. */
    private static final List<String> LABEL_KEYS =
            List.of("city", "town", "village", "municipality", "suburb", "county");
    /**
     * Basarili ama eslesen adres anahtari olmayan yaniti onbellege KOYARIZ (adsiz bir kutu
     * sonsuza dek yeniden cekilmesin). TRANSPORT/HTTP hatasi bunun disinda — hic onbellege
     * girmez, cunku kesinti genelde gecicidir ve bir sonraki cagri kurtarabilmeli.
     * Sentinel bos dizedir (Caffeine null saklamaz).
     */
    private static final String MISS = "";

    private final UnirestInstance http;
    private final String userAgent;
    private final Duration minInterval;
    private final String baseUrl;
    private final Cache<String, String> cache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofDays(30))
            .build();
    private final Semaphore slot = new Semaphore(1);
    private volatile long nextAllowedNanos = System.nanoTime();

    public NominatimGeocoder(UnirestInstance http, AppProps props) {
        this.http = http;
        String contact = AppProps.required("NOMINATIM_CONTACT", props.geocode().contact());
        this.userAgent = "BumpInto/" + APP_VERSION + " (" + contact + ")";
        this.minInterval = props.geocode().minInterval();
        String configured = props.geocode().baseUrl();
        this.baseUrl = configured.endsWith("/")
                ? configured.substring(0, configured.length() - 1) : configured;
    }

    @Override
    public Optional<String> label(GeoPoint point) {
        GeoPoint approx = TravelMinutes.approx(point);
        String key = String.format(Locale.ROOT, "%.2f,%.2f", approx.lat(), approx.lng());
        String cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached.equals(MISS) ? Optional.empty() : Optional.of(cached);
        }
        if (!tryAcquire()) {
            // Pencere dolu: etiket ATLANIR, bir sonraki poll'da yeniden denenir (K-B22).
            return Optional.empty();
        }
        String label = fetch(approx);
        if (label == null) {
            // Transport/HTTP hatasi onbellege KOYULMAZ: aga bagli gecici hata kalici bir
            // bosluga donusmesin, bir sonraki cagri yeniden dener.
            return Optional.empty();
        }
        // Basarili yanit — adres bulunamamis olsa bile (MISS) onbellege girer: adsiz kutu
        // tekrar tekrar cekilmez.
        cache.put(key, label);
        return label.equals(MISS) ? Optional.empty() : Optional.of(label);
    }

    @Override
    public Optional<GeoResult> forward(String query, GeoPoint bias) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }
        if (!tryAcquire()) {
            // Pencere dolu: "sonuc yok" ile karistirilmasin, cagiran 429 dondursun.
            throw new GeocodeBusyException();
        }
        try {
            var request = http.get(baseUrl + "/search")
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .queryString("format", "jsonv2")
                    .queryString("limit", 1)
                    .queryString("q", query);
            if (bias != null) {
                // Viewbox ~40 km: yalniz oncelik verir, sonuc disarida da olabilir.
                GeoPoint p = TravelMinutes.approx(bias);
                request = request.queryString("viewbox",
                        (p.lng() - 0.5) + "," + (p.lat() + 0.36) + "," + (p.lng() + 0.5) + "," + (p.lat() - 0.36));
            }
            HttpResponse<JsonNode> response = request.asJson();
            if (!response.isSuccess() || response.getBody() == null
                    || !response.getBody().isArray() || response.getBody().getArray().isEmpty()) {
                return Optional.empty();
            }
            JSONObject hit = response.getBody().getArray().getJSONObject(0);
            return Optional.of(new GeoResult(new GeoPoint(hit.getDouble("lat"), hit.getDouble("lon")),
                    hit.optString("display_name", null)));
        } catch (RuntimeException e) {
            log.warn("nominatim search failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String fetch(GeoPoint approx) {
        try {
            HttpResponse<JsonNode> response = http.get(baseUrl + "/reverse")
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .queryString("format", "jsonv2")
                    .queryString("zoom", 10)
                    .queryString("lat", approx.lat())
                    .queryString("lon", approx.lng())
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                // Transport/HTTP hatasi: null doner, cagiran onbellege KOYMAZ.
                log.warn("nominatim reverse returned {}", response.getStatus());
                return null;
            }
            JSONObject root = response.getBody().getObject();
            if (!root.has("address")) {
                // Basarili yanit, adres yok: MISS doner, cagiran onbellege KOYAR.
                return MISS;
            }
            JSONObject address = root.getJSONObject("address");
            for (String key : LABEL_KEYS) {
                String value = address.optString(key, "");
                if (!value.isBlank()) {
                    return value;
                }
            }
            // Basarili yanit, taninan hicbir anahtar yok: yine MISS — ayni sekilde onbellege girer.
            return MISS;
        } catch (RuntimeException e) {
            // Etiket bir SUS payidir: orta nokta kartinda satir gizlenir, oturum akar.
            // Bu da TRANSPORT hatasidir: null doner, onbellege KOYULMAZ.
            log.warn("nominatim reverse failed: {}", e.getMessage());
            return null;
        }
    }

    /** BLOKLAMAYAN throttle: dolu pencerede istek ATLANIR (etiket sonraki poll'da gelir; K-B22). */
    private boolean tryAcquire() {
        if (!slot.tryAcquire()) {
            return false;
        }
        try {
            if (System.nanoTime() < nextAllowedNanos) {
                return false;
            }
            nextAllowedNanos = System.nanoTime() + minInterval.toNanos();
            return true;
        } finally {
            slot.release();
        }
    }
}
