package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.safety.Block;
import org.springframework.stereotype.Component;

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

    @Override public List<Block> blocksOf(UUID blockerUserId) {
        return blocks.findByBlockerUserId(blockerUserId).stream()
                .map(BlockStoreAdapter::toBlock).toList();
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

    private static Block toBlock(BlockEntity b) {
        return new Block(b.id, b.blockerUserId, b.blockedUserId, b.blockedParticipantId,
                b.sessionId, b.createdAt);
    }
}
