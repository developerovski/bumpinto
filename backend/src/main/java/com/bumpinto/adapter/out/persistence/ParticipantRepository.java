package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<ParticipantEntity, UUID> {
    /** joinedAt sirasi: liste her istekte ayni; host ilk. ORDER BY yoksa satir guncellemesi
     *  (konum girisi) satiri heap'te sona tasiyip sirayi degistiriyordu. */
    List<ParticipantEntity> findBySessionIdOrderByJoinedAtAscIdAsc(UUID sessionId);

    List<ParticipantEntity> findBySessionIdIn(Collection<UUID> sessionIds);

    Optional<ParticipantEntity> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    @Query("select count(distinct p.displayName) from ParticipantEntity p, SessionEntity s "
            + "where s.id = p.sessionId and s.hostId = :hostId "
            + "and p.isHost = false and p.isManual = false")
    long countDistinctGuestsOfHost(UUID hostId);
}
