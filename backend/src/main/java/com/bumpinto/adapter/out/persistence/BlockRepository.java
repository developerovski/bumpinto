package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BlockRepository extends JpaRepository<BlockEntity, UUID> {
    List<BlockEntity> findByBlockerUserId(UUID blockerUserId);

    /**
     * Engel listesi + engellenenin adi (K-W16). Iki LEFT JOIN: satirda hedeflerden yalniz biri
     * dolu. Skaler tuple (entity degil) — ParticipantRepository.stampRowsOf'taki gerekceyle
     * hep commit edilmis hali okur.
     *
     * <p>Donen sutunlar sirayla: id, blockedUserId, blockedParticipantId, sessionId, createdAt,
     * users.name, users.deletedAt, participants.displayName, participants.anonymizedAt.
     */
    @Query("""
            select b.id, b.blockedUserId, b.blockedParticipantId, b.sessionId, b.createdAt,
                   u.name, u.deletedAt, p.displayName, p.anonymizedAt
            from BlockEntity b
            left join UserEntity u on u.id = b.blockedUserId
            left join ParticipantEntity p on p.id = b.blockedParticipantId
            where b.blockerUserId = :blockerUserId
            order by b.createdAt desc, b.id desc""")
    List<Object[]> listingRowsOf(UUID blockerUserId);

    List<BlockEntity> findByBlockedUserId(UUID blockedUserId);

    List<BlockEntity> findByBlockerUserIdAndSessionId(UUID blockerUserId, UUID sessionId);
}
