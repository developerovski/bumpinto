"""Overture Places NL -> venues_open_staging. DuckDB okur, COPY yazar."""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone

import duckdb
import psycopg

import catmap
import db

# NL kutusu (spec §5.2): batı, güney, doğu, kuzey
NL_BBOX = (3.2, 50.7, 7.3, 53.6)
DEFAULT_RELEASE = "2026-08-19.0"  # bucket listesi: .../release/ (2026-09-06 dogrulandi)
S3_TEMPLATE = "s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"

_QUERY = """
select
  id,
  names['primary']                       as name,
  categories['primary']                  as category,
  confidence,
  ST_X({geom})                           as lng,
  ST_Y({geom})                           as lat,
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


def list_parts(con, source: str) -> list[str]:
    """Kaynak deseni parcalara acar (S3'te 16 parquet); tek dosya verilirse kendisi doner.
    Parca parca okumak hem ilerleme yazdirir hem de bellegi tek parcayla sinirlar."""
    parts = [r[0] for r in con.execute("select file from glob(?) order by 1", [source]).fetchall()]
    if not parts:
        raise SystemExit(f"overture: desene uyan dosya yok: {source}")
    return parts


def geometry_expr(con, source: str) -> str:
    """Gercek Overture parquet'i GeoParquet'tir: spatial onu GEOMETRY okur ve ST_GeomFromWKB
    bind hatasi verir. Metadata'siz WKB blob (test fikstürü) ise donusum gerekir. DESCRIBE
    yalniz footer okur, satir cekmez."""
    types = {name: dtype for name, dtype, *_ in
             con.execute("describe select geometry from read_parquet(?)", [source]).fetchall()}
    return "geometry" if types.get("geometry") == "GEOMETRY" else "ST_GeomFromWKB(geometry)"


def read_places(con, source: str, bbox) -> list[dict]:
    west, south, east, north = bbox
    query = _QUERY.format(geom=geometry_expr(con, source))
    cur = con.execute(query, [source, west, east, south, north])
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
    parts = list_parts(con, source)
    print(f"overture: {len(parts)} parca taranacak ({source})", flush=True)
    total_read = total_kept = 0
    started = time.monotonic()
    with psycopg.connect(db.dsn_from_env()) as conn:
        for i, part in enumerate(parts, 1):
            t0 = time.monotonic()
            places = read_places(con, part, NL_BBOX)
            rows = to_rows(places)
            copy_rows(conn, rows)
            total_read += len(places)
            total_kept += len(rows)
            print(f"overture: parca {i}/{len(parts)}: {len(places)} okundu, {len(rows)} eslesti "
                  f"({time.monotonic() - t0:.0f}s, toplam {time.monotonic() - started:.0f}s)", flush=True)
        print(f"overture: toplam {total_read} okundu, {total_kept} eslesti", flush=True)
        report(conn)
    return 0


if __name__ == "__main__":
    sys.exit(main())
