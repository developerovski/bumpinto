package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<ParticipantEntity, UUID> {
    /** joinedAt sirasi: liste her istekte ayni; host ilk. ORDER BY yoksa satir guncellemesi
     *  (konum girisi) satiri heap'te sona tasiyip sirayi degistiriyordu. */
    List<ParticipantEntity> findBySessionIdOrderByJoinedAtAscIdAsc(UUID sessionId);

    List<ParticipantEntity> findBySessionIdIn(Collection<UUID> sessionIds);

    Optional<ParticipantEntity> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    /** Hesabin TUM koltuklari (hesap silmede anonimlestirilecek satirlar). */
    List<ParticipantEntity> findByUserId(UUID userId);

    @Query("select count(distinct p.displayName) from ParticipantEntity p, SessionEntity s "
            + "where s.id = p.sessionId and s.hostId = :hostId "
            + "and p.isHost = false and p.isManual = false")
    long countDistinctGuestsOfHost(UUID hostId);

    /**
     * Dis aktarmanin (R-B6) koltuk satirlari. Yalniz {@code userId}'nin KENDI koltuklari; oturum
     * adi/slug'i disinda baska katilimcinin hicbir alani secilmez.
     */
    @Query("""
            select p.id, s.slug, s.name, p.isHost, p.joinedAt, p.displayName,
                   p.lat, p.lng, p.locationLabel, p.travelMode
            from ParticipantEntity p, SessionEntity s
            where s.id = p.sessionId and p.userId = :userId
            order by p.joinedAt desc""")
    List<Object[]> exportRowsOf(UUID userId);

    /**
     * SKALER projeksiyon, entity sorgusu DEGIL — ve bu bilincli. Entity dondurseydi Hibernate
     * satirlari persistence context'te ZATEN duran ornekle eslestirir ve damgalarin ESKI
     * degerlerini verirdi: OSIV acik oldugu icin bir HTTP istegi bastan sona tek EntityManager
     * paylasir, {@code participantsOf} ile yuklenmis koltuklar oradadir ve bu arada damgalar
     * REQUIRES_NEW'da (ayri transaction, toplu UPDATE) yazilmis olur. Tuple sorgusu identity
     * map'i atlar, hep COMMIT EDILMIS hali okur.
     *
     * <p>Donen sutunlar sirayla: id, lastSeenAt, linkOpenedAt.
     */
    @Query("select p.id, p.lastSeenAt, p.linkOpenedAt from ParticipantEntity p "
            + "where p.sessionId = :sessionId")
    List<Object[]> stampRowsOf(UUID sessionId);

    @Modifying
    @Query("update ParticipantEntity p set p.lastSeenAt = :at where p.id = :id")
    int touchLastSeen(UUID id, Instant at);

    /** ILK acilis kazanir: davetin ne zaman goruldugu sonraki ziyaretlerle otelenmez. */
    @Modifying
    @Query("update ParticipantEntity p set p.linkOpenedAt = :at "
            + "where p.id = :id and p.linkOpenedAt is null")
    int markLinkOpened(UUID id, Instant at);
}
