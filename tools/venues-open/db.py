"""DSN donusumu, staging semasi ve atomik swap. Baska hicbir is yapmaz."""
from __future__ import annotations

import os
import sys
from urllib.parse import quote

STAGING_DDL = """
drop table if exists venues_open_staging;
create table venues_open_staging (
  id             text primary key,
  source         text not null,
  name           text not null,
  geom           geometry(Point,4326) not null,
  category       text,
  activity_types text[] not null,
  confidence     real not null,
  website        text,
  wikidata_id    text,
  photo_url      text,
  opening_hours  text,
  locality       text,
  address        text,
  updated_at     timestamptz not null
);
"""

# Swap ONCESI indeks adlari gecici: tablo adi degisince indeks adi degismez,
# eski venues_open'in indeksleri V11 adlarini hala tutuyor olur.
# GiST ifadesi V11 ile birebir ayni olmali (geom::geography) — dedupe.sql'deki
# ST_DWithin(geography) da bu indeksi kullanir, plain geom degil.
_STAGING_INDEXES = """
create index venues_open_staging_geom_gist
  on venues_open_staging using gist ((geom::geography));
create index venues_open_staging_activity_types_gin
  on venues_open_staging using gin (activity_types);
"""

# Swap: eski tablo dusunce V11 adlari serbest kalir, indeksler o adlara alinir.
SWAP_SQL = """
alter table venues_open rename to venues_open_old;
alter table venues_open_staging rename to venues_open;
drop table venues_open_old;
alter index venues_open_staging_geom_gist rename to venues_open_geom_gist;
alter index venues_open_staging_activity_types_gin rename to venues_open_activity_types_gin;
alter table venues_open rename constraint venues_open_staging_pkey to venues_open_pkey;
"""


def dsn_from_jdbc(jdbc_url: str, user: str, password: str) -> str:
    if not jdbc_url.startswith("jdbc:postgresql://"):
        raise ValueError(f"beklenen jdbc:postgresql:// oneki: {jdbc_url!r}")
    rest = jdbc_url[len("jdbc:postgresql://"):]
    host_db, _, params = rest.partition("?")
    host, _, database = host_db.partition("/")
    if ":" not in host:
        host = f"{host}:5432"
    dsn = f"postgresql://{quote(user, safe='')}:{quote(password, safe='')}@{host}/{database}"
    return f"{dsn}?{params}" if params else dsn


def dsn_from_env() -> str:
    return dsn_from_jdbc(os.environ["DB_URL"], os.environ["DB_USER"], os.environ["DB_PASSWORD"])


def staging_index_sql() -> str:
    return _STAGING_INDEXES


def create_staging(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(STAGING_DDL)
    conn.commit()


def create_staging_indexes(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(_STAGING_INDEXES)
    conn.commit()


def swap(conn) -> None:
    """venues_open <- venues_open_staging, tek transaction."""
    min_ratio = float(os.environ.get("SWAP_MIN_RATIO", "0.5"))
    with conn.cursor() as cur:
        cur.execute("select to_regclass('public.venues_open')")
        if cur.fetchone()[0] is None:
            raise RuntimeError(
                "venues_open yok: once backend V11 migration'i kosmali (B-13). Swap iptal."
            )
        cur.execute("select count(*) from venues_open")
        (live_count,) = cur.fetchone()
        cur.execute("select count(*) from venues_open_staging")
        (staging_count,) = cur.fetchone()
        # canli doluysa staging cok kucuk kalmis olabilir (bozuk kosu); swap'i reddet
        if live_count > 0 and staging_count < live_count * min_ratio:
            raise RuntimeError(
                f"staging ({staging_count} satir) canli venues_open'in ({live_count} satir) "
                f"%{min_ratio * 100:.0f}'inden az: swap iptal. SWAP_MIN_RATIO ile gevsetilebilir."
            )
        cur.execute(SWAP_SQL)
    conn.commit()
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("analyze venues_open")
    conn.autocommit = False


if __name__ == "__main__":
    # osm_import.sh bu ciktiyi osm2pgsql ve psql icin kullanir.
    if len(sys.argv) > 1 and sys.argv[1] == "--dsn":
        print(dsn_from_env())
    else:
        raise SystemExit("kullanim: python db.py --dsn")
