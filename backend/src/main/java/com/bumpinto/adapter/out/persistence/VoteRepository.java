package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<VoteEntity, VoteEntity.Key> {
    List<VoteEntity> findBySessionId(UUID sessionId);
}
