package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<ParticipantEntity, UUID> {
    /** joinedAt sirasi: liste her istekte ayni; host ilk. ORDER BY yoksa satir guncellemesi
     *  (konum girisi) satiri heap'te sona tasiyip sirayi degistiriyordu. */
    List<ParticipantEntity> findBySessionIdOrderByJoinedAtAscIdAsc(UUID sessionId);
    Optional<ParticipantEntity> findByToken(String token);
}
