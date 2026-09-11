package com.bumpinto.domain.port;

import com.bumpinto.domain.session.MeetCheckin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MeetCheckinStorePort {

    /** Ayni (oturum, katilimci) ikinci kez gelirse USTUNE yazar: cevap degistirilebilir. */
    void upsert(MeetCheckin checkin);

    /**
     * Hesabin met=true check-in zamanlari (koltuklari uzerinden), en yeniden eskiye. Sayac ve
     * haftalik seri icin (B-18). "Olmadi" cevaplari ve baskalarinin koltuklari disaridadir.
     */
    List<Instant> metCheckinTimesOf(UUID userId);
}
