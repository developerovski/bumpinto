package com.bumpinto.infra.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "bumpinto")
public record AppProps(Security security, Providers providers, Cors cors, Cookies cookies,
                       RateLimit rateLimit, Quota quota, Geocode geocode) {

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

    public record Providers(String foursquareKey, String googleKey) {

        @Override
        public String toString() {
            return "Providers[foursquareKey=" + MASK + ", googleKey=" + MASK + "]";
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
     * Saglayici kota takibi.
     *
     * @param refresh                  scheduler araligi; cache bundan tazeyse prob atilmaz
     * @param googleMonthlyBudget      Nearby Search icin SERT aylik tavan. Google'in kota
     *                                 telemetrisi yok (header yok, Cloud Monitoring gecikmeli
     *                                 ve servis hesabi ister); kota = bu butce − yerel sayac.
     *                                 Acilis modeli (spec §5.A.5): 1.000/ay = ucretsiz katman,
     *                                 sonrasi $35/1000 (maske Enterprise). Asilirsa arama
     *                                 yapilmaz, orkestrator Foursquare'e duser.
     * @param googlePhotoMonthlyBudget Place Photo medya cagrilari icin AYRI sert tavan
     *                                 (farkli SKU: 1.000 ucretsiz/ay, sonrasi $7/1000 —
     *                                 oturum basina en buyuk kalem). Bitince foto cozulmez,
     *                                 photoUrl null gelir ve kart monograma duser.
     */
    public record Quota(Duration refresh, int googleMonthlyBudget, int googlePhotoMonthlyBudget) {
    }

    /**
     * Nominatim kullanim politikasi (operations.osmfoundation.org/policies/nominatim):
     * uygulamayi ve ILETISIM ADRESINI tasiyan bir User-Agent ZORUNLU, saniyede en fazla 1
     * istek, sonuclar onbelleklenir. Ucu de burada: {@code contact} User-Agent'a girer,
     * {@code minInterval} throttle'i besler, onbellek adapterdedir.
     */
    public record Geocode(String contact, Duration minInterval) {
    }
}
