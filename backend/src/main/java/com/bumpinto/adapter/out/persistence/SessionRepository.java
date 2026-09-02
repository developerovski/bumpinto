package com.bumpinto.adapter.out.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<SessionEntity, UUID> {
    Optional<SessionEntity> findBySlug(String slug);

    List<SessionEntity> findByHostIdOrderByCreatedAtDescIdDesc(UUID hostId, Pageable page);

    long countByHostId(UUID hostId);
}
