-- Oturum artik 1-3 ilgi alani tasir. Depolama CSV: bu tablo runoff_venue_ids'i de
-- oyle tutuyor ve liste en fazla 3 elemanli -- text[] tek kazanci olan indekslenebilirligi
-- hicbir sorgu kullanmiyor.
alter table sessions rename column activity_type to activity_types;

-- Mekan hangi ilgi alanindan geldigini bilir: karisik destede kart rozeti ve deste
-- dengesi buna bakar. Eski satirlar tek aktiviteliydi -- oturumun degeri aynen gecer.
alter table venues add column activity_type text;

update venues v
   set activity_type = s.activity_types
  from sessions s
 where v.session_id = s.id
   and s.activity_types not like '%,%';
