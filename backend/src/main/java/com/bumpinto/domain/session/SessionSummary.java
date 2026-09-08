package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.List;

/**
 * Liste satiri: oturum + kayit zamani + katilimci sayimlari + karar verilen mekan (varsa).
 *
 * <p>{@code participants} sayimlarin AYNI kaynagindan turer; kart uzerindeki avatar yigininin
 * ihtiyaci kadar alan tasir. Sira {@code SessionStorePort.participantsOf} ile ayni: katilma
 * sirasi, yani host once.
 */
public record SessionSummary(Session session, Instant createdAt, int participantCount,
                             int readyCount, int doneCount,
                             List<ParticipantSummary> participants,
                             String decidedVenueName, String decidedVenuePhotoUrl) {

    /** Liste KOPYALANIR: cagiranin elindeki liste sonradan degisse ozet bozulmaz. */
    public SessionSummary {
        participants = List.copyOf(participants);
    }

    public SessionSummary withSession(Session s) {
        return new SessionSummary(s, createdAt, participantCount, readyCount, doneCount,
                participants, decidedVenueName, decidedVenuePhotoUrl);
    }

    /**
     * Avatar yigininin gordugu KADARI: bas harf icin ad, kesik cizgili "henuz hazir degil"
     * halkasi icin {@code ready}, tac rozeti icin {@code host}. Koltuk id'si, hesap kimligi,
     * e-posta ve konum BURAYA GIRMEZ — liste ekrani bunlarin hicbirini cizmez.
     *
     * <p>{@code ready} = kisi konumunu verdi mi; {@code readyCount} ile ayni kural, oturum
     * durumuna gore DEGISMEZ (sayimlar da degismiyor).
     */
    public record ParticipantSummary(String displayName, boolean ready, boolean host) {
    }
}
