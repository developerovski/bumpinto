package com.bumpinto.application.session;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;

import java.util.UUID;

/**
 * Host da bir katilimcidir: oda ici yetki oturuma kapsamli KATILIMCI kimliginden gelir, hesap
 * JWT'sinden degil. Hesap token'i 12 saat, oturum 24 saat yasiyordu; yetki hesaba bagliyken
 * host arada kendi oturumunu yonetemez oluyordu. Imzali claim'e korukorune guvenilmez —
 * koltuk DB'den okunur, boylece silinmis bir host koltugunun token'i de is gormez.
 */
public final class SessionGates {

    private SessionGates() {
    }

    public static void requireHost(SessionStorePort store, Session session, UUID participantId) {
        boolean host = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId))
                .findFirst().map(Participant::host).orElse(false);
        if (!host) {
            throw new ForbiddenException("only the host can do this");
        }
    }
}
