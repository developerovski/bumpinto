package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

/**
 * R-B2'nin ikinci yarisi (K-B33): AccountDeletion damgayi atar, silen taraf burasidir.
 *
 * <p>users'a bakan FK'lar V15'te bunu kaldirabilecek sekilde tanimlandi: rapor
 * {@code on delete set null} (moderasyon izi kalir, kisisel bag kopar), engel
 * {@code on delete cascade}. O karar olmadan bu silme FK ihlaliyle patlardi.
 */
interface AccountRetentionRepository extends Repository<UserEntity, UUID> {

    /** {@code for update skip locked} gerekcesi SessionRetentionRepository'de yazili. */
    @Modifying
    @Query(value = """
            delete from users
             where id in (
                   select id from users
                    where purge_after is not null and purge_after < :now
                    order by purge_after
                    limit :batchSize
                    for update skip locked
             )
            """, nativeQuery = true)
    int deletePurgeableBatch(@Param("now") Instant now, @Param("batchSize") int batchSize);
}
