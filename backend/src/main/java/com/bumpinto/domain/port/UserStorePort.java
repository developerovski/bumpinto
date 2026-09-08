package com.bumpinto.domain.port;

import com.bumpinto.domain.user.UserProfile;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface UserStorePort {

    UUID upsertByEmail(String email, String name);

    /**
     * Apple girisi. Eslestirme SIRASI: (1) apple_sub, (2) e-posta — private-relay e-postasi
     * eslesmeyecegi icin sub birincildir. Bulunan hesaba APPLE saglayicisi EKLENIR.
     */
    UUID upsertByAppleSub(String appleSub, String email, String name);

    void saveAppleRefreshToken(UUID userId, String refreshToken);

    Optional<String> appleRefreshToken(UUID userId);

    /**
     * Erisimi ANINDA kapatir: damgalar ve KIMLIK ALANLARINI serbest birakir (e-posta benzersizligi
     * geri verilir, apple_sub silinir) — yoksa ayni kisi 30 gun yeniden kayit olamazdi.
     * Satirin kendisini Task 12'nin AccountRetention'i temizler (K-B33).
     */
    void softDelete(UUID userId, Instant deletedAt, Instant purgeAfter);

    Optional<UserProfile> profileOf(UUID userId);

    UserProfile saveProfile(UserProfile profile);
}
