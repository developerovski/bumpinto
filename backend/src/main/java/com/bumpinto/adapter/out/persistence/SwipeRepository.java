package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SwipeRepository extends JpaRepository<SwipeEntity, SwipeEntity.Key> {
    List<SwipeEntity> findBySessionId(UUID sessionId);
}
