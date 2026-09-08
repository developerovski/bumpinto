package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.session.SessionExpiry;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class UserProfileQueries {

    static final int LIST_LIMIT = 20;

    public record Stats(long sessionsHosted, long friendsMet) {
    }

    public record Me(UserProfile profile, Stats stats) {
    }

    /**
     * Hesabin oturum listesi. {@code past} en fazla {@link #LIST_LIMIT} satir tasir;
     * {@code pastTruncated} tavana degil GERCEKTEN kesilmeye bakar — tam 20 gecmis oturumu olan
     * host'a "daha var" denmez. {@code open} tavansizdir.
     */
    public record MySessions(List<SessionSummary> open, List<SessionSummary> past,
                             boolean pastTruncated) {
    }

    private final UserStorePort users;
    private final SessionStorePort sessions;
    private final Clock clock;

    public UserProfileQueries(UserStorePort users, SessionStorePort sessions, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.clock = clock;
    }

    public Me me(UUID userId) {
        UserProfile profile = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        return new Me(profile, new Stats(sessions.hostedSessionCount(userId),
                sessions.distinctGuestsOfHost(userId)));
    }

    /**
     * Tembel expiry okuma tarafinda: TTL'i gecmis oturum EXPIRED raporlanir, yazilmaz.
     *
     * <p>Kutulara ayirma SORGUDA yapilir, listeyi kestikten SONRA degil. Tek sorgu + tavan
     * duzeninde 20'den fazla yeni oturum acan host'un eski ama hala ACIK oturumu listeden
     * sessizce dusuyordu; tavan yalniz sinirsiz buyuyen gecmisi korumali.
     *
     * <p>Kesildi mi sorusuna tahminle degil OLCEREK cevap verilir: bir fazlasi istenir, fazla
     * satir donduyse liste gercekten kesilmistir.
     */
    public MySessions mySessions(UUID userId) {
        Instant now = clock.instant();
        List<SessionSummary> past = sessions.pastSummariesOfHost(userId, now, LIST_LIMIT + 1);
        boolean truncated = past.size() > LIST_LIMIT;
        return new MySessions(applyExpiry(sessions.openSummariesOfHost(userId, now), now),
                applyExpiry(truncated ? past.subList(0, LIST_LIMIT) : past, now), truncated);
    }

    private static List<SessionSummary> applyExpiry(List<SessionSummary> rows, Instant now) {
        return rows.stream().map(s -> s.withSession(SessionExpiry.applied(s.session(), now)))
                .toList();
    }
}
