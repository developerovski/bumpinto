alter table users add column default_lat            double precision;
alter table users add column default_lng            double precision;
alter table users add column default_location_label text;
alter table users add column default_activity       text;
-- null = tercih yok → istemci tarayici dilini kullanir (spec §6 algilama sirasi)
alter table users add column language               text;
