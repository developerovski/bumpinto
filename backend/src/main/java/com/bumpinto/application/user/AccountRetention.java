package com.bumpinto.application.user;

import com.bumpinto.domain.port.RetentionPort;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;

/**
 * R-B2'nin ikinci yarisi (K-B33): {@link AccountDeletion} erisimi kapatip {@code purge_after}
 * damgasini atar, bu servis damgasi dolan satirlari FIZIKSEL siler.
 *
 * <p>{@link com.bumpinto.application.session.SessionRetention} ile ayni iskelet, TEK farki
 * gecikme: orada cutoff "simdi - 30 gun"dur, burada gecikme zaten DAMGADA durur — cutoff
 * dogrudan "simdi"dir.
 */
@Service
public class AccountRetention {

    /** Hesap sayisi oturum sayisindan kucuktur; ayni parti buyuklugu yine de fazlasiyla yeter. */
    static final int BATCH_SIZE = 500;

    /** Bozuk bir adapter surekli dolu parti dondurse bile kosu sinirli is yapar. */
    static final int MAX_BATCHES = 1000;

    private final RetentionPort port;
    private final Clock clock;

    public AccountRetention(RetentionPort port, Clock clock) {
        this.port = port;
        this.clock = clock;
    }

    /** @return fiziksel silinen hesap sayisi */
    public int purgeDeleted() {
        Instant now = clock.instant();
        int total = 0;
        for (int batch = 0; batch < MAX_BATCHES; batch++) {
            int deleted = port.deleteAccountsPurgeableBefore(now, BATCH_SIZE);
            total += deleted;
            if (deleted < BATCH_SIZE) {
                return total;
            }
        }
        return total;
    }
}
