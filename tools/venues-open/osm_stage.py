"""osm_poi_raw -> venues_open_staging. Eslesme category_map.yml'den gelir."""
from __future__ import annotations

import sys
from urllib.parse import quote

import psycopg

import catmap
import db

FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/{file}?width=1000"

SQL = """
insert into venues_open_staging
  (id, source, name, geom, category, activity_types, confidence,
   website, wikidata_id, photo_url, opening_hours, locality, address, updated_at)
select 'osm:' || r.osm_type || r.osm_id,
       'osm',
       r.name,
       r.geom,
       min(m.k || '=' || m.v),
       array_agg(distinct m.atype),
       1.0,
       r.tags ->> 'website',
       r.tags ->> 'wikidata',
       null,
       r.tags ->> 'opening_hours',
       r.tags ->> 'addr:city',
       null,
       now()
from osm_poi_raw r
join (values {values}) as m(k, v, atype) on r.tags ->> m.k = m.v
where r.name is not null and length(r.name) > 1
group by r.osm_type, r.osm_id, r.name, r.geom, r.tags
on conflict (id) do nothing
"""


def photo_url_from_tags(tags: dict) -> str | None:
    """wikimedia_commons (File:<ad>) > image (http ile baslarsa) > None; Wikidata P18 sonra doldurur."""
    tags = tags or {}
    commons = tags.get("wikimedia_commons")
    if commons and commons.startswith("File:"):
        return FILEPATH.format(file=quote(commons[len("File:"):], safe=""))
    image = tags.get("image")
    if image and image.startswith("http"):
        return image
    return None


def stage(conn) -> int:
    pairs = catmap.osm_pairs()
    values = ",".join(["(%s,%s,%s)"] * len(pairs))
    params = [x for pair in pairs for x in pair]
    with conn.cursor() as cur:
        cur.execute(SQL.format(values=values), params)
        inserted = cur.rowcount
        cur.execute(
            "select s.id, r.tags from venues_open_staging s"
            " join osm_poi_raw r on s.id = 'osm:' || r.osm_type || r.osm_id"
            " where s.source = 'osm' and s.photo_url is null")
        updates = [(url, sid) for sid, tags in cur.fetchall()
                   if (url := photo_url_from_tags(tags))]
        if updates:
            cur.executemany(
                "update venues_open_staging set photo_url = %s where id = %s", updates)
    conn.commit()
    return inserted


def main() -> int:
    with psycopg.connect(db.dsn_from_env()) as conn:
        n = stage(conn)
        print(f"osm: {n} satir staging'e yazildi")
        with conn.cursor() as cur:
            cur.execute("select t, count(*) from venues_open_staging, unnest(activity_types) t"
                        " where source = 'osm' group by 1 order by 1")
            for atype, cnt in cur.fetchall():
                print(f"  {atype:<12} {cnt}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
