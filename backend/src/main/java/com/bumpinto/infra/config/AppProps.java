package com.bumpinto.infra.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "bumpinto")
public record AppProps(Security security, Providers providers, Cors cors, Cookies cookies,
                       RateLimit rateLimit) {

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
}
