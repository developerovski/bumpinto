package com.bumpinto.domain.port;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * KALICI presence damgalari. {@code PresencePort} "su an burada mi"yi surec icinde tutar ve grace
 * penceresinden sonra koltugu unutur; "Son gorulen · 12:38" ise dun de dogru olmali.
 */
public interface PresenceStampsPort {

    record Stamps(Instant lastSeenAt, Instant linkOpenedAt) {
    }

    /** Her gelis/kopusta yazilir; bilinmeyen koltuk NO-OP'tur. */
    void touchLastSeen(UUID participantId, Instant at);

    /**
     * YALNIZ ilk kez yazilir: "davet ne zaman goruldu" sorusunun cevabi ILK acilistir, sonraki
     * ziyaretler onu otelemez. Ikinci cagri sessizce hicbir sey yapmaz.
     */
    void markLinkOpened(UUID participantId, Instant at);

    /** Damgasi olan koltuklar; hic damgasi olmayan oturum uyesi haritada YER ALMAZ. */
    Map<UUID, Stamps> stampsOf(UUID sessionId);
}
