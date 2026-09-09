package com.bumpinto.application.user;

import com.bumpinto.domain.port.AppleTokensPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.Participant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Hesap silme (Apple 5.1.1(v), Play hesap silme). Semantik §2: erisim ANINDA kapanir, fiziksel
 * satirlar 30 gunde gider — o supurme Task 12'deki AccountRetention'dir (K-B33).
 *
 * <p>Uc farkli muamele: (1) HOST oldugu oturumlar SILINIR — sahipsiz kalamazlar; (2) baskasinin
 * oturumundaki koltuklar SILINMEZ, anonimlesir — silinseydi o oturumun orta noktasi, deste
 * geometrisi ve oy populasyonu geriye donuk degisir, katilan herkesin sayilari bozulurdu;
 * (3) hesap satiri kimligi birakir ve damgalanir.
 */
@Service
public class AccountDeletion {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletion.class);

    /** §2 + O15 metni: "30 gun icinde kalici olarak silinir". */
    static final Duration PURGE_DELAY = Duration.ofDays(30);

    /** Anonimlesen koltugun gorunen adi (O15/W18 kopyasi). */
    static final String ANONYMOUS_NAME = "Ayrıldı";

    private final UserStorePort users;
    private final SessionStorePort sessions;
    private final AppleTokensPort apple;
    private final RefreshTokens refreshTokens;
    private final Clock clock;

    public AccountDeletion(UserStorePort users, SessionStorePort sessions, AppleTokensPort apple,
                           RefreshTokens refreshTokens, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.apple = apple;
        this.refreshTokens = refreshTokens;
        this.clock = clock;
    }

    @Transactional
    public void delete(UUID userId) {
        Instant now = clock.instant();
        // Revoke ONCE: softDelete apple_refresh_token'i temizler, sonra okunamazdi.
        revokeApple(userId);
        // Erisim ANINDA kapanir: yenileme jetonu kalsaydi silinmis hesap 30 gun boyunca
        // kendine yeni erisim jetonu bastirabilirdi ve soft delete'in anlami kalmazdi.
        refreshTokens.revokeAllOf(userId);
        for (UUID sessionId : sessions.sessionIdsOfHost(userId)) {
            sessions.deleteSession(sessionId);
        }
        for (Participant seat : sessions.participantsOfUser(userId)) {
            sessions.anonymizeParticipant(seat.id(), ANONYMOUS_NAME, now);
        }
        users.softDelete(userId, now, now.plus(PURGE_DELAY));
    }

    /** FAIL-OPEN: Apple'a ulasilamamasi kullanicinin silme hakkini engellemez. */
    private void revokeApple(UUID userId) {
        try {
            users.appleRefreshToken(userId).ifPresent(apple::revoke);
        } catch (RuntimeException appleDown) {
            log.warn("apple revoke failed for {}: {}", userId, appleDown.getMessage());
        }
    }
}
