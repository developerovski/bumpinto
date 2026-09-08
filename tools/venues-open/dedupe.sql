-- Ayni normalize ad + 50 m: kaybeden satir atilir.
-- Ticari kategoride Overture, bos zaman/doga kategorisinde OSM kazanir (spec §5.2).
-- SINIR: normalize yalnizca alfanumerik birakir, aksan cevirmez (unaccent uzantisi
-- istemiyoruz). "Cafe" ile "Café" ayri satir kalir; kabul edilen kayip.

create temporary table dedupe_losers on commit drop as
with n as (
  select id, source, geom,
         lower(regexp_replace(name, '[^[:alnum:]]', '', 'g')) as nname,
         activity_types && array['WALK','HIKE','SWIM','FITNESS','THEME_PARK'] as nature
  from venues_open_staging
)
select case
         when a.nature or b.nature
           then case when a.source = 'osm' then b.id else a.id end
         else case when a.source = 'overture' then b.id else a.id end
       end as id
from n a
join n b
  on a.id < b.id
 and a.nname = b.nname
 and length(a.nname) >= 3
 and a.source <> b.source
 and ST_DWithin(a.geom::geography, b.geom::geography, 50);

delete from venues_open_staging where id in (select id from dedupe_losers);
