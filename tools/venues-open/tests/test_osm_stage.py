import os

import psycopg
import pytest

import db
import osm_stage


@pytest.fixture
def conn():
    jdbc = os.environ.get("TEST_DB_URL")
    if not jdbc:
        pytest.skip("TEST_DB_URL yok")
    with psycopg.connect(db.dsn_from_jdbc(jdbc, os.environ.get("TEST_DB_USER", "bumpinto"),
                                          os.environ.get("TEST_DB_PASSWORD", "bumpinto"))) as c:
        with c.cursor() as cur:
            cur.execute("create extension if not exists postgis")
            cur.execute("drop table if exists osm_poi_raw")
            cur.execute("""create table osm_poi_raw (
                             osm_id bigint, osm_type char(1), name text,
                             tags jsonb, geom geometry(Point,4326))""")
        c.commit()
        db.create_staging(c)
        yield c


def raw(conn, osm_id, osm_type, name, tags, lng=5.47, lat=51.44):
    with conn.cursor() as cur:
        cur.execute("insert into osm_poi_raw values (%s,%s,%s,%s,ST_SetSRID(ST_Point(%s,%s),4326))",
                    (osm_id, osm_type, name, psycopg.types.json.Jsonb(tags), lng, lat))
    conn.commit()


def staged(conn):
    with conn.cursor() as cur:
        cur.execute("select id, activity_types, wikidata_id, source, confidence, photo_url"
                    " from venues_open_staging order by id")
        return cur.fetchall()


def test_single_tag_maps_to_one_type(conn):
    raw(conn, 1, "N", "Stadswandelpark", {"leisure": "park", "name": "Stadswandelpark"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert row[0] == "osm:N1"
    assert row[1] == ["WALK"]
    assert row[3] == "osm"
    assert row[4] == pytest.approx(1.0)      # OSM satiri elle etiketli (spec §5.2)


def test_two_matching_tags_merge_into_one_row(conn):
    # category_map.yml'de "sport=" cifti yok; iki farkli anahtar (leisure/tourism) kullanilir.
    raw(conn, 2, "W", "Parkmuseum", {"leisure": "park", "tourism": "museum"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert sorted(row[1]) == ["MUSEUM", "WALK"]


def test_wikidata_tag_is_carried(conn):
    raw(conn, 3, "N", "Van Abbemuseum", {"tourism": "museum", "wikidata": "Q1815688"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert row[2] == "Q1815688"


def test_unmapped_tag_is_dropped(conn):
    raw(conn, 4, "N", "Kantoor", {"office": "company"})
    osm_stage.stage(conn)
    assert staged(conn) == []


def test_photo_url_from_wikimedia_commons_tag(conn):
    raw(conn, 5, "N", "Van Abbemuseum",
        {"tourism": "museum", "wikimedia_commons": "File:Van Abbemuseum 01.jpg"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert row[5] == ("https://commons.wikimedia.org/wiki/Special:FilePath/"
                       "Van%20Abbemuseum%2001.jpg?width=1000")
