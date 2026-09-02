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

    /** Tembel expiry okuma tarafinda: TTL'i gecmis oturum EXPIRED raporlanir, yazilmaz. */
    public List<SessionSummary> mySessions(UUID userId) {
        Instant now = clock.instant();
        return sessions.summariesOfHost(userId, LIST_LIMIT).stream()
                .map(s -> s.withSession(SessionExpiry.applied(s.session(), now)))
                .toList();
    }
}
