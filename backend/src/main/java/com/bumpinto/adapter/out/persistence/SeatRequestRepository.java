package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface SeatRequestRepository extends JpaRepository<SeatRequestEntity, UUID> {

    Optional<SeatRequestEntity> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    /** Host paneli GELIS sirasinda okur: ilk isteyen ustte. */
    List<SeatRequestEntity> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
