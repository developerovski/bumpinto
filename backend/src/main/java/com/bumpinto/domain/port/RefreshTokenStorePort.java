package com.bumpinto.domain.port;

import com.bumpinto.domain.user.RefreshTokenRecord;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenStorePort {

    void save(RefreshTokenRecord token);

    /** Arama HER ZAMAN ozet uzerinden: duz jeton hicbir sorguya girmez. */
    Optional<RefreshTokenRecord> findByHash(String tokenHash);

    void revoke(UUID id, Instant at);

    /**
     * Hirsizlik tepkisi: ailenin IPTAL EDILMEMIS tum jetonlari kapanir. Iptal edilmis satirin
     * damgasi KORUNUR — denetimde "ne zaman kapandi" bilgisi kaybolmaz.
     */
    int revokeFamily(UUID familyId, Instant at);

    /** Cikis ve hesap silme: kullanicinin TUM aileleri (tum cihazlar) kapanir. */
    int revokeAllOfUser(UUID userId, Instant at);
}
