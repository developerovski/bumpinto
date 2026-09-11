package com.bumpinto.domain.port;

import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.safety.BlockListing;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface BlockStorePort {

    Block save(Block block);

    /** Bu hesabin engelleri, en yeni once, engellenenin okuma anindaki adiyla (bkz. BlockListing). */
    List<BlockListing> listingsOf(UUID blockerUserId);

    /** Kendi engelini siler; baskasinin engeli BULUNAMAMIS sayilir (false), varligi sizmaz. */
    boolean delete(UUID blockerUserId, UUID blockId);

    /** Bu hesabin engelledigi HESAPLAR. */
    Set<UUID> blockedUserIdsOf(UUID blockerUserId);

    /** Bu hesabi engelleyen HESAPLAR — ses odasi kurali iki yonludur. */
    Set<UUID> blockerUserIdsOf(UUID blockedUserId);

    /** Bu hesabin o oturumda engelledigi ANONIM katilimcilar. */
    Set<UUID> blockedParticipantIdsOf(UUID blockerUserId, UUID sessionId);
}
