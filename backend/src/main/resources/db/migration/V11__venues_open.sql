-- Acik taban: Overture Places NL + OSM NL, aylik yenilenir (I-2 ithal isleri).
create extension if not exists postgis;

create table venues_open (
    id             text primary key,          -- "<kaynak>:<dis id>", ithal isi uretir
    source         text not null,             -- overture | osm
    name           text not null,
    geom           geometry(Point, 4326) not null,
    category       text,
    activity_types text[] not null,           -- eslenen ActivityType adlari
    confidence     real not null,             -- Overture olcumu, OSM satirinda 1.0
    website        text,
    wikidata_id    text,
    photo_url      text,                      -- Wikimedia Commons FilePath
    opening_hours  text,
    locality       text,
    address        text,
    updated_at     timestamptz not null
);

create index venues_open_geom_gist on venues_open using gist ((geom::geography));
create index venues_open_activity_types_gin on venues_open using gin (activity_types);
