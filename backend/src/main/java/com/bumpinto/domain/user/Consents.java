package com.bumpinto.domain.user;

import java.time.Instant;

/** Acik riza (KVKK m.5/1 + Play Data safety); varsayilan HEPSI false. */
public record Consents(boolean location, boolean microphone, boolean analytics,
                       Instant updatedAt, int version) {

    public static final int CURRENT_VERSION = 1;

    public static Consents none() {
        return new Consents(false, false, false, null, CURRENT_VERSION);
    }

    public Consents updated(boolean newLocation, boolean newMicrophone, boolean newAnalytics,
                            Instant when) {
        return new Consents(newLocation, newMicrophone, newAnalytics, when, CURRENT_VERSION);
    }
}
