package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.user.Consents;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/**
 * Riza yazma AYRI uctur (§2): PUT /api/me tam-yerine-koymadir; riza alani oraya konsaydi yalniz
 * adini guncelleyen bir istemci uc rizayi da sessizce false'a cekerdi.
 */
@Service
public class UserConsents {

    private final UserStorePort users;
    private final Clock clock;

    public UserConsents(UserStorePort users, Clock clock) {
        this.users = users;
        this.clock = clock;
    }

    @Transactional
    public Consents update(UUID userId, boolean location, boolean microphone, boolean analytics) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        Consents updated = current.consents()
                .updated(location, microphone, analytics, clock.instant());
        return users.saveProfile(current.withConsents(updated)).consents();
    }
}
