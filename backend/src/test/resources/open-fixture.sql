delete from venues_open;
insert into venues_open (id, source, name, geom, category, activity_types, confidence, website, photo_url, updated_at) values
 ('osm:1', 'osm', 'Stadswandelpark', st_setsrid(st_makepoint(5.4750, 51.4450), 4326), 'leisure=park', '{WALK}', 1.0, null, 'https://commons.example/park.jpg', now()),
 ('ovt:2', 'overture', 'Koffie Corner',  st_setsrid(st_makepoint(5.4700, 51.4420), 4326), 'cafe', '{COFFEE}', 0.9, 'https://koffie.example', null, now()),
 ('osm:3', 'osm', 'Verre Park',          st_setsrid(st_makepoint(5.4700, 51.5230), 4326), 'leisure=park', '{WALK}', 1.0, null, null, now()),
 ('ovt:4', 'overture', 'Spookpark',      st_setsrid(st_makepoint(5.4720, 51.4430), 4326), 'park', '{WALK}', 0.4, null, null, now()),
 ('osm:5', 'osm', 'Groene Route',        st_setsrid(st_makepoint(5.4680, 51.4400), 4326), 'route=hiking', '{WALK,HIKE}', 1.0, null, null, now());
