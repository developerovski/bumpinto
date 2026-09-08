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
