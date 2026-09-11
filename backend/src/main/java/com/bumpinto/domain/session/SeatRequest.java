package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Acik plana katilim istegi. HER ZAMAN hesaplidir ({@code userId} null olamaz): Kesfet
 * yabancilara aciktir ama sorumlulugu olmayan bir kimlige degil — engel listesi, rapor ve
 * mukerrer istek kapisi hepsi hesap kimligine dayanir.
 *
 * <p>Istegin KOLTUK olmadigina dikkat: onaylanana kadar {@code participants}'ta satiri yoktur,
 * yani orta noktayi ve deste geometrisini etkilemez.
 */
public record SeatRequest(UUID id, UUID sessionId, UUID userId, String displayName,
                          GeoPoint location, String locationLabel, TravelMode travelMode,
                          String note, SeatStatus status, Instant createdAt, Instant decidedAt) {

    public SeatRequest {
        Objects.requireNonNull(sessionId, "sessionId");
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(displayName, "displayName");
        // null -> CAR / PENDING: Participant'in compact ctor'uyla ayni coerce deseni.
        if (travelMode == null) {
            travelMode = TravelMode.CAR;
        }
        if (status == null) {
            status = SeatStatus.PENDING;
        }
    }

    public static SeatRequest pending(UUID sessionId, UUID userId, String displayName,
                                      GeoPoint location, String locationLabel,
                                      TravelMode travelMode, String note, Instant now) {
        return new SeatRequest(UUID.randomUUID(), sessionId, userId, displayName, location,
                locationLabel, travelMode, note, SeatStatus.PENDING, now, null);
    }

    /**
     * Karar BIR KEZ verilir. Ikinci karar sessizce gecseydi host paneline iki kez basmak
     * onaylanmis bir koltugu reddedebilir, ya da reddedilen birini geri alabilirdi.
     */
    public SeatRequest decide(SeatStatus decision, Instant when) {
        if (status != SeatStatus.PENDING) {
            throw new IllegalStateException("already decided");
        }
        return new SeatRequest(id, sessionId, userId, displayName, location, locationLabel,
                travelMode, note, decision, createdAt, when);
    }

    public boolean pending() {
        return status == SeatStatus.PENDING;
    }
}
