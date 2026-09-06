package com.bumpinto.adapter.out.open;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/** Her parametre :adiyla baglanir; dizi string_to_array ile kurulur (dize birlestirme YOK). */
interface VenueOpenRepository extends Repository<VenueOpenEntity, String> {

    @Query(value = """
            select id                                   as id,
                   name                                 as name,
                   st_y(geom)                           as lat,
                   st_x(geom)                           as lng,
                   category                             as category,
                   array_to_string(activity_types, ',') as activityTypes,
                   website                              as website,
                   photo_url                            as photoUrl,
                   opening_hours                        as openingHours,
                   locality                             as locality,
                   address                              as address
              from venues_open
             where st_dwithin(geom::geography,
                              st_setsrid(st_makepoint(:lng, :lat), 4326)::geography,
                              :radiusMeters)
               and activity_types && string_to_array(:types, ',')
               and confidence >= :minConfidence
             order by st_distance(geom::geography, st_setsrid(st_makepoint(:lng, :lat), 4326)::geography)
             limit :max
            """, nativeQuery = true)
    List<OpenVenueRow> nearby(@Param("lat") double lat, @Param("lng") double lng,
                              @Param("radiusMeters") double radiusMeters,
                              @Param("types") String types,
                              @Param("minConfidence") double minConfidence,
                              @Param("max") int max);
}
