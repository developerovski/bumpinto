package com.bumpinto.adapter.out.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<SessionEntity, UUID> {
    Optional<SessionEntity> findBySlug(String slug);

    List<SessionEntity> findByHostIdOrderByCreatedAtDescIdDesc(UUID hostId, Pageable page);

    /**
     * Kesfet listesi. Dort kapi: (1) ACIK plan (`meetAt is not null` — kismi indeks tam bunu
     * tasiyor), (2) bulusma GELECEKTE ve ufuk icinde, (3) TTL gecmemis, (4) karar verilmis ya da
     * suresi dolmus degil. Biri eksik olsaydi Kesfet "herkesin oturumlari" listesine donerdi.
     */
    @Query("""
            select s from SessionEntity s
            where s.meetAt is not null and s.meetAt > :now and s.meetAt < :until
              and s.expiresAt >= :now and s.status not in ('DECIDED', 'EXPIRED')
            order by s.meetAt asc
            """)
    List<SessionEntity> findPublicUpcoming(Instant now, Instant until);

    /**
     * Acik oturumlar: kapanmamis VE TTL'i gecmemis. Kosul, tembel expiry'nin
     * {@code Session.isExpired} kuralinin (now > expiresAt) SQL karsiligidir — tam anina denk
     * gelen satir hala aciktir, bu yuzden {@code >=}.
     */
    @Query("""
            select s from SessionEntity s
            where s.hostId = :hostId and s.status not in ('DECIDED', 'EXPIRED')
              and s.expiresAt >= :now
            order by s.createdAt desc, s.id desc""")
    List<SessionEntity> findOpenByHost(UUID hostId, Instant now);

    /** Gecmis: karar verilmis, EXPIRED yazilmis ya da TTL'i sessizce gecmis olanlar. */
    @Query("""
            select s from SessionEntity s
            where s.hostId = :hostId
              and (s.status in ('DECIDED', 'EXPIRED') or s.expiresAt < :now)
            order by s.createdAt desc, s.id desc""")
    List<SessionEntity> findPastByHost(UUID hostId, Instant now, Pageable page);

    long countByHostId(UUID hostId);

    Optional<SessionEntity> findByJoinCode(String joinCode);

    boolean existsByJoinCode(String joinCode);
}
