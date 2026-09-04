package com.bumpinto.domain.port;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/**
 * "Kim su an bu oturumda" — uyelik DEGIL, canlilik. Uyelik DB satiridir ve silinmez; presence
 * yalnizca acik bir soketin varligidir ve surec icinde yasar.
 */
public interface PresencePort {

    /** wsSessionId: WS/STOMP baglantisinin kendi kimligi — ayni katilimcinin iki sekmesini ayirir. */
    void arrived(UUID sessionId, UUID participantId, String wsSessionId);

    /** Eslesmeyen bir left (arrived hic gelmemis wsSessionId) saglikli baska bir baglantiyi etkilemez. */
    void left(UUID sessionId, UUID participantId, String wsSessionId);

    /** Bagli olan YA DA grace penceresi icinde kopmus katilimcilar. */
    Set<UUID> presentIn(UUID sessionId);

    /**
     * Kopmadan sonra kisinin hala "burada" sayildigi sure. Cagirana lazim: kopma anindaki yayin
     * "hala online" der ve durum ancak bu sure GECINCE degisir — o an icin ikinci bir yayin
     * gerekir, yoksa istemci degisikligi ancak emniyet poll'unde gorur.
     */
    Duration graceWindow();
}
