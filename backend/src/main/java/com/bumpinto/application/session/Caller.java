package com.bumpinto.application.session;

import java.util.UUID;

/**
 * Katilimi isteyen taraf: elinde bir koltuk (katilimci token'i) ya da bir hesap olabilir, ikisi
 * de olmayabilir — davet linki anonim katilima aciktir.
 *
 * <p>Kimligi TASIR, dogrulamaz: dogrulama filtrelerde bitmistir. Uygulama katmani bunu yalniz
 * "bu cagiranin zaten koltugu var mi" sorusu icin kullanir.
 */
public record Caller(UUID participantId, UUID userId) {

    public static final Caller ANONYMOUS = new Caller(null, null);

    public static Caller participant(UUID participantId) {
        return new Caller(participantId, null);
    }

    public static Caller account(UUID userId) {
        return new Caller(null, userId);
    }
}
