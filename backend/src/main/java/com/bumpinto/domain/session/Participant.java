package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.time.Instant;
import java.util.UUID;

/**
 * Token TASIMAZ: katilimci kimligi imzali bir JWT'dir ve yalniz istemcide yasar
 * (TokenService.issueParticipantToken). Sir domain'e de DB'ye de girmez — bu yuzden bu record
 * icin toString maskesi de gerekmez.
 *
 * <p>userId: koltugun SAHIBI olan hesap; anonim katilimda ve elle eklenen noktada null. Kimlik
 * yalniz istemcideki token'da dursaydi, token'i olmayan bir tarayicida (yeni cihaz, temizlenmis
 * cerez) uye "yeni misafir" olurdu: host kendi oturumuna ikinci koltukla girer, davetli hayalet
 * bir katilimci birakirdi.
 *
 * <p>manual=true: host'un elle ekledigi konum (SOLO). Token'i YOK, kaydirmaz, oy popülasyonuna
 * girmez; yalniz orta nokta / yaricap / deste geometrisine dahildir.
 *
 * <p>travelMode: spec §4.5b. Varsayilan CAR — elle konumlar ve gec katilanlar da CAR sayilir.
 */
public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, Instant deckDoneAt,
                          boolean manual, String locationLabel, TravelMode travelMode,
                          UUID userId) {

    public Participant {
        if (travelMode == null) {
            travelMode = TravelMode.CAR;
        }
    }

    /** Sahipsiz koltuk: anonim davetli ve elle eklenen nokta. */
    public Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                       boolean host, Instant deckDoneAt, boolean manual, String locationLabel,
                       TravelMode travelMode) {
        this(id, sessionId, displayName, location, host, deckDoneAt, manual, locationLabel,
                travelMode, null);
    }

    public boolean hasLocation() {
        return location != null;
    }

    public boolean deckDone() {
        return deckDoneAt != null;
    }

    /* votes() BURADA DEGIL: cevap oturuma baglidir (capali oturumda konum gerekmez) ve
       Participant oturumu gormez. Bkz. domain/session/Voters. */

    public Participant locatedAt(GeoPoint newLocation, String newLabel, TravelMode newMode) {
        return new Participant(id, sessionId, displayName, newLocation, host, deckDoneAt,
                manual, newLabel, newMode == null ? travelMode : newMode, userId);
    }

    /** Anonim alinmis koltugun sahiplenilmesi (K-B23); sahibi olan koltuk el degistirmez. */
    public Participant ownedBy(UUID owner) {
        return new Participant(id, sessionId, displayName, location, host, deckDoneAt,
                manual, locationLabel, travelMode, owner);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, when,
                manual, locationLabel, travelMode, userId);
    }

}
