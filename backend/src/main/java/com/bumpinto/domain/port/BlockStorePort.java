package com.bumpinto.domain.port;

import com.bumpinto.domain.safety.Block;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface BlockStorePort {

    Block save(Block block);

    List<Block> blocksOf(UUID blockerUserId);

    /** Kendi engelini siler; baskasinin engeli BULUNAMAMIS sayilir (false), varligi sizmaz. */
    boolean delete(UUID blockerUserId, UUID blockId);

    /** Bu hesabin engelledigi HESAPLAR. */
    Set<UUID> blockedUserIdsOf(UUID blockerUserId);

    /** Bu hesabi engelleyen HESAPLAR — ses odasi kurali iki yonludur. */
    Set<UUID> blockerUserIdsOf(UUID blockedUserId);

    /** Bu hesabin o oturumda engelledigi ANONIM katilimcilar. */
    Set<UUID> blockedParticipantIdsOf(UUID blockerUserId, UUID sessionId);
}
