import os

import duckdb
import psycopg
import pytest

import db
from overture_import import NL_BBOX, copy_rows, read_places, to_rows

# Overture semasinin taklidi: id, names, categories, confidence, geometry (WKB), bbox,
# websites, addresses. Uc satir: NL icinde eslesen (park), NL disinda (Berlin), eslenmeyen kategori.
FIXTURE_SQL = """
copy (
  select * from (values
    ('ovt-park', {{'primary': 'Stadswandelpark'}}, {{'primary': 'park'}}, 0.93::float,
     ST_AsWKB(ST_Point(5.4700, 51.4400))::blob,
     {{'xmin': 5.47::float, 'xmax': 5.47::float, 'ymin': 51.44::float, 'ymax': 51.44::float}},
     ['https://park.example'], [{{'locality': 'Eindhoven', 'freeform': 'Parklaan 1'}}]),
    ('ovt-berlin', {{'primary': 'Tiergarten'}}, {{'primary': 'park'}}, 0.90::float,
     ST_AsWKB(ST_Point(13.35, 52.51))::blob,
     {{'xmin': 13.35::float, 'xmax': 13.35::float, 'ymin': 52.51::float, 'ymax': 52.51::float}},
     [], []),
    ('ovt-unknown', {{'primary': 'Kantoor'}}, {{'primary': 'office_supply_store'}}, 0.99::float,
     ST_AsWKB(ST_Point(5.48, 51.45))::blob,
     {{'xmin': 5.48::float, 'xmax': 5.48::float, 'ymin': 51.45::float, 'ymax': 51.45::float}},
     [], [])
  ) t(id, names, categories, confidence, geometry, bbox, websites, addresses)
) to '{path}' (format parquet);
"""


@pytest.fixture
def places_parquet(tmp_path):
    path = tmp_path / "places.parquet"
    con = duckdb.connect()
    con.execute("install spatial; load spatial;")
    con.execute(FIXTURE_SQL.format(path=path.as_posix()))
    return con, path.as_posix()


def test_staging_rows_from_parquet(places_parquet):
    con, path = places_parquet
    places = read_places(con, path, NL_BBOX)

    # bbox NL disini eler: Berlin satiri okunan yerlerde bile olmamali
    ids = [p["id"] for p in places]
    assert "ovt-berlin" not in ids

    rows = to_rows(places)

    # eslenmeyen kategori (office_supply_store) staging'e hic girmez
    assert [r[0] for r in rows] == ["overture:ovt-park"]

    (row,) = rows
    assert row[0] == "overture:ovt-park"
    assert row[5] == "{WALK}"          # activity_types
    assert row[6] == pytest.approx(0.93)  # confidence
    assert row[7] == "https://park.example"  # website
    assert row[11] == "Eindhoven"      # locality


def test_copy_rows_writes_real_timestamp_not_now_literal():
    jdbc = os.environ.get("TEST_DB_URL")
    if not jdbc:
        pytest.skip("TEST_DB_URL yok")
    with psycopg.connect(db.dsn_from_jdbc(jdbc, os.environ.get("TEST_DB_USER", "bumpinto"),
                                          os.environ.get("TEST_DB_PASSWORD", "bumpinto"))) as conn:
        with conn.cursor() as cur:
            cur.execute("create extension if not exists postgis")
        conn.commit()
        db.create_staging(conn)
        row = ("overture:ts1", "overture", "Test Venue", "SRID=4326;POINT(5.47 51.44)",
               "park", "{WALK}", 0.9, None, None, None, None, None, None)
        copy_rows(conn, [row])
        with conn.cursor() as cur:
            cur.execute("select updated_at from venues_open_staging where id = %s", ("overture:ts1",))
            (updated_at,) = cur.fetchone()
        assert updated_at is not None      # "now()" literal COPY'de reddedilirdi, gercek deger geldi
