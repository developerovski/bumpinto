package com.bumpinto.adapter.in.web;

import java.util.UUID;

/**
 * STOMP adresleri tek yerde uretilir: {@link VoiceInboundGuard} (interceptor),
 * {@link VoiceRoomListener} (listener) ve {@link VoiceSignalController} (relay) buradan cagirir.
 * Testler (orn. VoiceOverWebSocketTest) dizeleri BILINCLI olarak buraya import etmez, kendi
 * icinde tekrar yazar — sozlesme boylece bu sinifin uygulamasindan BAGIMSIZ dogrulanmis olur.
 */
final class VoiceDestinations {

    static final String APP_PREFIX = "/app";

    private VoiceDestinations() {
    }

    static String sessionTopic(String slug) {
        return "/topic/session/" + slug;
    }

    /** Kisinin ozel sinyal konusu; abone olmak ses uyeligidir (spec K4). */
    static String inbox(String slug, UUID participantId) {
        return sessionTopic(slug) + "/voice/" + participantId;
    }

    /** Istemcinin SEND yapabildigi TEK adres. */
    static String signal(String slug) {
        return APP_PREFIX + "/sessions/" + slug + "/voice/signal";
    }
}
