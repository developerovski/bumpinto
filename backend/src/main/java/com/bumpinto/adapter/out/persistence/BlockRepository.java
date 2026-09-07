package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BlockRepository extends JpaRepository<BlockEntity, UUID> {
    List<BlockEntity> findByBlockerUserId(UUID blockerUserId);

    List<BlockEntity> findByBlockedUserId(UUID blockedUserId);

    List<BlockEntity> findByBlockerUserIdAndSessionId(UUID blockerUserId, UUID sessionId);
}
