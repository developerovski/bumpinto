package com.bumpinto.domain.voice;

import java.util.List;

/**
 * Istemciye verilen ICE listesi. {@code relay=false}: TURN yok, yalniz STUN — Cloudflare
 * ayarsiz ya da erisilemez (K11). Kimlik kisa omurludur, sunucuda saklanmaz.
 */
public record IceConfig(List<IceServer> iceServers, boolean relay) {

    public IceConfig {
        iceServers = List.copyOf(iceServers);
    }

    public record IceServer(List<String> urls, String username, String credential) {

        public IceServer {
            urls = List.copyOf(urls);
        }

        /** TURN kimligi loglara sizmasin: credential maskelenir, urls/username teshis icin acik kalir. */
        @Override
        public String toString() {
            return "IceServer[urls=" + urls + ", username=" + username + ", credential=***]";
        }
    }

    private static final List<String> STUN_URLS =
            List.of("stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302");

    public static IceConfig stunOnly() {
        return new IceConfig(List.of(new IceServer(STUN_URLS, null, null)), false);
    }
}
