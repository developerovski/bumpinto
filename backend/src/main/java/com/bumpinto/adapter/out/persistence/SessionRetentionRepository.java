package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

/**
 * Saklama silmesi sicak {@link SessionRepository}'nin DISINDA durur: purge ayri bir ilgi
 * alanidir ve buradaki tek metot cok pod'lu kosuyu da cozer.
 */
interface SessionRetentionRepository extends Repository<SessionEntity, UUID> {

    /**
     * Bir partilik kalici silme. Alt tablolar (participants/venues/swipes/votes) semadaki
     * {@code on delete cascade} ile gider — SessionCascadeDeleteTest bunu kanitlar.
     *
     * <p><b>Neden {@code for update skip locked}:</b> zamanlayici HER replikada koser. Ayni
     * satirlari hedefleyen iki pod normalde birbirini kilitte bekletir; {@code skip locked} ile
     * her pod baskasinin tuttugu satirlari atlar ve AYRIK partiler alir. Leader election ya da
     * ShedLock gerekmez (yeni bagimlilik yok, yeni hata sinifi yok).
     *
     * <p>Yan etki: cakisma aninda parti {@code batchSize}'dan kisa donebilir ve dongu elde is
     * varken durur — o isi zaten baska bir pod ya da ertesi gunun kosusu alir.
     *
     * <p>Sinir KATI ({@code <}): tam cutoff aninda suresi dolan oturum bu kosuda kalir,
     * {@code Session.isExpired} konvansiyonuyla ayni.
     */
    @Modifying
    @Query(value = """
            delete from sessions
             where id in (
                   select id from sessions
                    where expires_at < :cutoff
                    order by expires_at
                    limit :batchSize
                    for update skip locked
             )
            """, nativeQuery = true)
    int deleteExpiredBatch(@Param("cutoff") Instant cutoff, @Param("batchSize") int batchSize);
}
