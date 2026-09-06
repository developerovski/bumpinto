package com.bumpinto.infra.config;

import com.bumpinto.domain.session.ActivityType;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "bumpinto")
public record AppProps(Security security, Cors cors, Cookies cookies, RateLimit rateLimit,
                       Geocode geocode, Voice voice, Turn turn,
                       Venues venues, MapProps map, Routing routing, Retention retention) {

    /** Sir tasiyan alanlar toString'de bu degerle degistirilir. */
    private static final String MASK = "***";

    /**
     * Fail-closed ayar kontrolu: bos/eksik degerin yani sira COZULMEMIS placeholder da
     * ("${X}", env yoksa Boot degeri oldugu gibi birakir) reddedilir. Aksi halde deploy
     * sessizce ayaga kalkar ve arıza calisma zamaninda "hic kimse giris yapamiyor" olarak cikar.
     */
    public static String required(String envName, String value) {
        if (value == null || value.isBlank() || value.startsWith("${")) {
            throw new IllegalStateException(envName + " is not configured");
        }
        return value;
    }

    public record Security(String googleClientId, String tokenSecret, Duration tokenTtl) {

        /** googleClientId sir degil (istemcilerde acikca tasinir), teshis icin okunur kalir. */
        @Override
        public String toString() {
            return "Security[googleClientId=" + googleClientId + ", tokenSecret=" + MASK
                    + ", tokenTtl=" + tokenTtl + "]";
        }
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Cookies(boolean secure, String domain) {
    }

    /**
     * trustForwardedFor: X-Forwarded-For'a guvenilip guvenilmeyecegi. Istemci bu header'i
     * uydurabilir; yalnizca header'i EZEN guvenilir bir ingress arkasinda acilir.
     * Varsayilan kapali — dogrudan internete acik deploy rate limit'i baypas edemesin.
     */
    public record RateLimit(boolean trustForwardedFor) {
    }

    /**
     * Nominatim kullanim politikasi (operations.osmfoundation.org/policies/nominatim):
     * uygulamayi ve ILETISIM ADRESINI tasiyan bir User-Agent ZORUNLU, saniyede en fazla 1
     * istek, sonuclar onbelleklenir. Ucu de burada: {@code contact} User-Agent'a girer,
     * {@code minInterval} throttle'i besler, onbellek adapterdedir.
     * {@code baseUrl}: kendi kumemizdeki Nominatim'e gecis tek env ile olur.
     */
    public record Geocode(String contact, Duration minInterval, String baseUrl) {
    }

    /** maxDuration: ses odasinin sert omru (spec K7). TURN kimligi de bu sureye baglanir. */
    public record Voice(Duration maxDuration) {
    }

    /**
     * Cloudflare Realtime TURN anahtari. Bos birakilabilir: uygulama ayaga kalkar, kimlik
     * yerine yalniz STUN verilir ve acilista bir kez WARN loglanir (K11) — ses yan ozelliktir,
     * giris degil; {@link AppProps#required} kurali burada bilincli olarak uygulanmaz.
     */
    public record Turn(String keyId, String apiToken) {

        public boolean configured() {
            return keyId != null && !keyId.isBlank() && !keyId.startsWith("${")
                    && apiToken != null && !apiToken.isBlank() && !apiToken.startsWith("${");
        }

        @Override
        public String toString() {
            return "Turn[keyId=" + keyId + ", apiToken=" + MASK + "]";
        }
    }

    /**
     * Kaynak basina ayar. {@code budget} 0 = sinirsiz (yerel kaynaklar). {@code key} yalniz
     * {@code requiresKey} kaynaklarda zorunlu — kontrol VenueSourceConfigValidator'da.
     */
    public record VenueSourceProps(boolean enabled, String key, int budget, String tier) {

        /** Iki ctor var: Spring baglamayi kanonik olana yonlendirmek icin isaret sart. */
        @ConstructorBinding
        public VenueSourceProps {
        }

        /** Testler ve eski cagiranlar: tier verilmezse premium. */
        public VenueSourceProps(boolean enabled, String key, int budget) {
            this(enabled, key, budget, null);
        }

        /**
         * {@code tier}: yalniz Foursquare okur. {@code premium} (varsayilan) foto/puan/saat ister ve
         * cagri Premium faturalanir ($18,75/1k, ucretsiz payi YOK); {@code pro} yalniz temel alanlari
         * ister, Sandbox'in aylik 500 ucretsiz Pro cagrisi icinde kalir — foto ve puan gelmez.
         */
        public boolean premium() {
            return tier == null || !"pro".equalsIgnoreCase(tier.trim());
        }

        @Override
        public String toString() {
            return "VenueSourceProps[enabled=" + enabled + ", key=" + MASK
                    + ", budget=" + budget + ", tier=" + tier + "]";
        }
    }

    /**
     * @param sources kaynak id -> ayar
     * @param route   ActivityType -> virgullu kaynak id listesi; sira SABITTIR (spec §4)
     */
    public record Venues(Map<String, VenueSourceProps> sources,
                         Map<ActivityType, String> route) {

        /** "foursquare,open" -> [foursquare, open]; tanimsiz tur = bos liste. */
        public List<String> routeFor(ActivityType type) {
            String raw = route.get(type);
            if (raw == null || raw.isBlank()) {
                return List.of();
            }
            return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .toList();
        }

        /** Kaynagin anahtari; kaynak tanimsizsa null (required() bunu reddeder). */
        public String keyOf(String sourceId) {
            VenueSourceProps p = sources.get(sourceId);
            return p == null ? null : p.key();
        }
    }

    /**
     * Adi {@code MapProps}, yapilandirma yolu {@code bumpinto.map} (baglama BILESEN ADINDAN
     * gelir, tip adindan degil). {@code Map} adi ayni dosyadaki {@code java.util.Map}'i golgelerdi.
     */
    public record MapProps(String engine, Tiles tiles) {

        public record Tiles(String styleUrl) {
        }
    }

    /** Profil basina OSRM base URL; bos dize = o profil kapali. */
    public record Routing(Osrm osrm) {

        public record Osrm(String car, String bicycle, String foot) {
        }
    }

    public record Retention(boolean enabled) {
    }
}
