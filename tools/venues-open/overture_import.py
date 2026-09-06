"""Overture Places NL -> venues_open_staging. DuckDB okur, COPY yazar."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import duckdb
import psycopg

import catmap
import db

# NL kutusu (spec §5.2): batı, güney, doğu, kuzey
NL_BBOX = (3.2, 50.7, 7.3, 53.6)
DEFAULT_RELEASE = "2026-08-20.0"
S3_TEMPLATE = "s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"

_QUERY = """
select
  id,
  names['primary']                       as name,
  categories['primary']                  as category,
  confidence,
  ST_X(ST_GeomFromWKB(geometry))         as lng,
  ST_Y(ST_GeomFromWKB(geometry))         as lat,
  case when len(websites) > 0 then websites[1] end          as website,
  case when len(addresses) > 0 then addresses[1].locality end as locality,
  case when len(addresses) > 0 then addresses[1].freeform end as address
from read_parquet(?)
where bbox.xmin >= ? and bbox.xmax <= ? and bbox.ymin >= ? and bbox.ymax <= ?
  and names['primary'] is not null
  and categories['primary'] is not null
"""


def connect_duckdb() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    # Uzantilar varsayilan olarak $HOME/.duckdb'ye iner; konteynerde HOME yazilabilir degil
    # (USER 1000, "/.duckdb: Permission denied"). Her kosulda yazilabilir olan WORK_DIR'i kullan.
    ext_dir = os.path.join(os.environ.get("WORK_DIR", "/work"), "duckdb")
    os.makedirs(ext_dir, exist_ok=True)
    con.execute(f"set extension_directory='{ext_dir}';")
    con.execute("install spatial; load spatial; install httpfs; load httpfs;")
    con.execute("set s3_region='us-west-2';")
    return con


def read_places(con, source: str, bbox) -> list[dict]:
    west, south, east, north = bbox
    cur = con.execute(_QUERY, [source, west, east, south, north])
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def to_rows(places: list[dict]) -> list[tuple]:
    """staging kolon sirasi; eslenmeyen kategori atilir."""
    index = catmap.overture_index()
    rows = []
    for p in places:
        types = index.get(p["category"])
        if not types:
            continue
        rows.append((
            f"overture:{p['id']}",
            "overture",
            p["name"],
            f"SRID=4326;POINT({p['lng']} {p['lat']})",
            p["category"],
            "{" + ",".join(types) + "}",
            float(p["confidence"] or 0.0),
            p["website"],
            None,                      # wikidata_id — OSM tarafinda
            None,                      # photo_url — T4 doldurur
            None,                      # opening_hours
            p["locality"],
            p["address"],
        ))
    return rows


def copy_rows(conn, rows: list[tuple]) -> None:
    cols = ("id, source, name, geom, category, activity_types, confidence, website, "
            "wikidata_id, photo_url, opening_hours, locality, address, updated_at")
    now = datetime.now(timezone.utc).isoformat()   # kosu basina bir kere; "now()" metni COPY'de literal kalirdi
    with conn.cursor() as cur:
        with cur.copy(f"copy venues_open_staging ({cols}) from stdin") as cp:
            for r in rows:
                cp.write_row(r + (now,))
    conn.commit()


def report(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            select t, count(*) from venues_open_staging, unnest(activity_types) t
            where source = 'overture' group by 1 order by 1
        """)
        counts = cur.fetchall()   # bir kere al: imlec ikinci fetchall'da tukenmis olurdu
    print("overture: tur basina satir")
    for atype, n in counts:
        print(f"  {atype:<12} {n}")
    missing = sorted(set(catmap.load()) - {a for a, _ in counts})
    if missing:
        print(f"UYARI: Overture'da hic satir gelmeyen turler: {missing} "
              f"-> category_map.yml slug'lari yanlis olabilir (spec §16.7)")


def main() -> int:
    release = os.environ.get("OVERTURE_RELEASE", DEFAULT_RELEASE)
    source = os.environ.get("OVERTURE_SOURCE") or S3_TEMPLATE.format(release=release)
    con = connect_duckdb()
    places = read_places(con, source, NL_BBOX)
    rows = to_rows(places)
    print(f"overture: {len(places)} okundu, {len(rows)} eslesti ({source})")
    with psycopg.connect(db.dsn_from_env()) as conn:
        copy_rows(conn, rows)
        report(conn)
    return 0


if __name__ == "__main__":
    sys.exit(main())
