package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<ParticipantEntity, UUID> {
    List<ParticipantEntity> findBySessionId(UUID sessionId);
    Optional<ParticipantEntity> findByToken(String token);
}
