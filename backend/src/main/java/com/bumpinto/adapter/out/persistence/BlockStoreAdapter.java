package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.safety.BlockListing;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class BlockStoreAdapter implements BlockStorePort {

    private final BlockRepository blocks;

    public BlockStoreAdapter(BlockRepository blocks) {
        this.blocks = blocks;
    }

    @Override public Block save(Block block) {
        BlockEntity b = new BlockEntity();
        b.id = block.id();
        b.blockerUserId = block.blockerUserId();
        b.blockedUserId = block.blockedUserId();
        b.blockedParticipantId = block.blockedParticipantId();
        b.sessionId = block.sessionId();
        blocks.save(b);
        return block;
    }

    @Override public List<BlockListing> listingsOf(UUID blockerUserId) {
        return blocks.listingRowsOf(blockerUserId).stream().map(r -> {
            UUID blockedUserId = (UUID) r[1];
            Block block = new Block((UUID) r[0], blockerUserId, blockedUserId, (UUID) r[2],
                    (UUID) r[3], (Instant) r[4]);
            String name = blockedUserId != null
                    ? visibleName((String) r[5], (Instant) r[6])
                    : visibleName((String) r[7], (Instant) r[8]);
            return new BlockListing(block, name);
        }).toList();
    }

    /** Silinmis hesabin / anonimlesmis koltugun adi yer tutucudur, gosterilmez. */
    private static String visibleName(String name, Instant gone) {
        return gone != null || name == null || name.isBlank() ? null : name;
    }

    /** Baskasinin engeli BULUNAMAMIS sayilir: varligi bile sizmaz. */
    @Override public boolean delete(UUID blockerUserId, UUID blockId) {
        return blocks.findById(blockId)
                .filter(b -> blockerUserId.equals(b.blockerUserId))
                .map(b -> {
                    blocks.delete(b);
                    return true;
                })
                .orElse(false);
    }

    @Override public Set<UUID> blockedUserIdsOf(UUID blockerUserId) {
        return blocks.findByBlockerUserId(blockerUserId).stream()
                .map(b -> b.blockedUserId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    @Override public Set<UUID> blockerUserIdsOf(UUID blockedUserId) {
        return blocks.findByBlockedUserId(blockedUserId).stream()
                .map(b -> b.blockerUserId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    @Override public Set<UUID> blockedParticipantIdsOf(UUID blockerUserId, UUID sessionId) {
        return blocks.findByBlockerUserIdAndSessionId(blockerUserId, sessionId).stream()
                .map(b -> b.blockedParticipantId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

}
