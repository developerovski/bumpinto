package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

interface VenueRetentionRepository extends Repository<VenueEntity, UUID> {

    /** Indirgenen sutunlar spec §11'de sayili; kimlik/koordinat/link DOKUNULMAZ. name is not null = idempotentlik. */
    @Modifying
    @Query(value = """
            update venues v set name = null, rating = null, popularity = null,
                   price_level = null, hours_today = null, address = null, locality = null,
                   category = null, photo_url = null, rating_count = null
              from sessions s
             where v.session_id = s.id
               and v.provider in (:providers)
               and s.expires_at < :now
               and (s.decided_venue_id is null or v.id <> s.decided_venue_id)
               and v.name is not null
            """, nativeQuery = true)
    int stripExpired(@Param("providers") Set<String> providers, @Param("now") Instant now);

    @Modifying
    @Query(value = """
            update venues v set photo_url = null, rating = null, popularity = null,
                   price_level = null, hours_today = null, address = null, locality = null,
                   category = null, rating_count = null
              from sessions s
             where v.session_id = s.id
               and v.provider in (:providers)
               and s.expires_at < :now
               and v.id = s.decided_venue_id
               -- idempotent: indirgenecek bir sey kaldiysa
               and num_nonnulls(v.photo_url, v.rating, v.popularity, v.price_level, v.hours_today, v.address, v.locality, v.category, v.rating_count) > 0
            """, nativeQuery = true)
    int stripWinnerPhoto(@Param("providers") Set<String> providers, @Param("now") Instant now);

    @Modifying
    @Query(value = """
            update venues set name = null, rating = null, popularity = null, price_level = null,
                   hours_today = null, address = null, locality = null, category = null,
                   photo_url = null, rating_count = null
             where provider in (:providers) and fetched_at < :cutoff and name is not null
            """, nativeQuery = true)
    int stripAged(@Param("providers") Set<String> providers, @Param("cutoff") Instant cutoff);
}
