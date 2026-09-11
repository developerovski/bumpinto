package com.bumpinto.domain.port;

import com.bumpinto.domain.session.SeatRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeatRequestStorePort {

    SeatRequest save(SeatRequest request);

    Optional<SeatRequest> findById(UUID id);

    /** Mukerrer istek kapisi: (oturum, kullanici) ikilisi TEKTIR (V20 unique indeks). */
    Optional<SeatRequest> findBySessionAndUser(UUID sessionId, UUID userId);

    List<SeatRequest> findBySession(UUID sessionId);
}
