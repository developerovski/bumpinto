package com.bumpinto.application.user;

import com.bumpinto.domain.port.AppleTokensPort;
import com.bumpinto.domain.port.UserStorePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Apple girisinin hesap tarafi. Eslestirme/birlestirme kurali depoda (upsertByAppleSub);
 * burada duran tek karar refresh token'in FAIL-OPEN takasidir.
 */
@Service
public class AccountIdentity {

    private final UserStorePort users;
    private final AppleTokensPort apple;

    public AccountIdentity(UserStorePort users, AppleTokensPort apple) {
        this.users = users;
        this.apple = apple;
    }

    @Transactional
    public UUID upsertApple(String appleSub, String email, String name, String authorizationCode) {
        UUID userId = users.upsertByAppleSub(appleSub, email, name);
        if (authorizationCode != null && !authorizationCode.isBlank()) {
            apple.exchangeRefreshToken(authorizationCode)
                    .ifPresent(token -> users.saveAppleRefreshToken(userId, token));
        }
        return userId;
    }
}
