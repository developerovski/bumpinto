package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

interface ProviderUsageRepository extends Repository<ProviderUsageEntity, ProviderUsageEntity.Key> {

    /** TEK ifadede artir ve yeni degeri oku; iki ifade olsaydi iki pod ayni sayiyi okurdu. */
    @Query(value = """
            insert into provider_usage (provider, month, calls) values (:provider, :month, 1)
            on conflict (provider, month) do update set calls = provider_usage.calls + 1
            returning calls
            """, nativeQuery = true)
    long increment(@Param("provider") String provider, @Param("month") LocalDate month);

    @Query(value = "select coalesce((select calls from provider_usage "
            + "where provider = :provider and month = :month), 0)", nativeQuery = true)
    long current(@Param("provider") String provider, @Param("month") LocalDate month);
}
