package com.bumpinto.domain.port;

import com.bumpinto.domain.session.MeetCheckin;

public interface MeetCheckinStorePort {

    /** Ayni (oturum, katilimci) ikinci kez gelirse USTUNE yazar: cevap degistirilebilir. */
    void upsert(MeetCheckin checkin);
}
