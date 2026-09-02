package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;

import java.time.Instant;

/**
 * Tembel expiry TEK yerde: TTL'i geçmiş oturum, kayıtlı statüsü ne olursa olsun EXPIRED sayılır.
 * DB'ye YAZILMAZ — expiry hesaplanan bir durumdur, okumanın yan etkisi olmaz.
 */
public final class SessionExpiry {

    private SessionExpiry() {
    }

    /** Komut tarafı: süresi dolmuş oturum reddedilir. */
    public static Session required(SessionStorePort store, String slug, Instant now) {
        Session session = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        if (expired(session, now)) {
            throw new ConflictException("session is closed: " + SessionStatus.EXPIRED);
        }
        return session;
    }

    /** Okuma tarafı: süresi dolmuş oturum EXPIRED olarak raporlanır (kayıt değişmez). */
    public static Session applied(Session session, Instant now) {
        return expired(session, now) ? session.withStatus(SessionStatus.EXPIRED) : session;
    }

    private static boolean expired(Session session, Instant now) {
        return session.status() == SessionStatus.EXPIRED || session.isExpired(now);
    }
}
