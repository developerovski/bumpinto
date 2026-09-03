package com.bumpinto.adapter.out.geocode;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMinutes;
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

/**
 * Orta noktanin kasaba/semt kelimesi (spec §5.A.4). Politika geregi (bkz. {@link AppProps.Geocode}):
 * iletisim adresli User-Agent, saniyede <=1 istek, sonuc onbellekli. {@code zoom=10} kasaba
 * duzeyidir — sokak adresi ISTEMIYORUZ, hem gereksiz hem gizlilik acisindan fazla.
 *
 * <p>Onbellek anahtari YUVARLANMIS konumdur (~1 km): ayni sehirdeki iki oturum tek istek eder,
 * ve tam koordinat hicbir zaman ucuncu tarafa gitmez.
 *
 * <p>Atif borcu: bu veriyi gosteren her yuzeyde "© OpenStreetMap contributors" (W-6a.9).
 */
@Component
public class NominatimReverseGeocoder implements ReverseGeocodePort {

    private static final Logger log = LoggerFactory.getLogger(NominatimReverseGeocoder.class);
    private static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
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
    private final Cache<String, String> cache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofDays(30))
            .build();
    private final Object gate = new Object();
    private long nextAllowedNanos;

    public NominatimReverseGeocoder(UnirestInstance http, AppProps props) {
        this.http = http;
        String contact = AppProps.required("NOMINATIM_CONTACT", props.geocode().contact());
        this.userAgent = "BumpInto/" + APP_VERSION + " (" + contact + ")";
        this.minInterval = props.geocode().minInterval();
        this.nextAllowedNanos = System.nanoTime();
    }

    @Override
    public Optional<String> label(GeoPoint point) {
        GeoPoint approx = TravelMinutes.approx(point);
        String key = String.format(Locale.ROOT, "%.2f,%.2f", approx.lat(), approx.lng());
        String cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached.equals(MISS) ? Optional.empty() : Optional.of(cached);
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

    private String fetch(GeoPoint approx) {
        throttle();
        try {
            HttpResponse<JsonNode> response = http.get(REVERSE_URL)
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

    /** En fazla 1 istek / {@code minInterval} — politika kurali, tek surec icinde yeterli. */
    private void throttle() {
        synchronized (gate) {
            long waitNanos = nextAllowedNanos - System.nanoTime();
            if (waitNanos > 0) {
                try {
                    Thread.sleep(waitNanos / 1_000_000, (int) (waitNanos % 1_000_000));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            nextAllowedNanos = System.nanoTime() + minInterval.toNanos();
        }
    }
}
