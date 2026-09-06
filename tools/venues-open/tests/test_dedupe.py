import os
import pathlib

import psycopg
import pytest

import db

DDL = pathlib.Path(__file__).parents[1] / "dedupe.sql"


@pytest.fixture
def conn():
    jdbc = os.environ.get("TEST_DB_URL")
    if not jdbc:
        pytest.skip("TEST_DB_URL yok (docker compose up -d postgres)")
    with psycopg.connect(db.dsn_from_jdbc(jdbc, os.environ.get("TEST_DB_USER", "bumpinto"),
                                          os.environ.get("TEST_DB_PASSWORD", "bumpinto"))) as c:
        with c.cursor() as cur:
            cur.execute("create extension if not exists postgis")
        c.commit()
        db.create_staging(c)
        yield c


def insert(conn, id_, source, name, lng, lat, types):
    with conn.cursor() as cur:
        cur.execute(
            "insert into venues_open_staging (id, source, name, geom, activity_types,"
            " confidence, updated_at) values (%s, %s, %s, ST_SetSRID(ST_Point(%s,%s),4326),"
            " %s, 1.0, now())",
            (id_, source, name, lng, lat, types))
    conn.commit()


def ids(conn):
    with conn.cursor() as cur:
        cur.execute("select id from venues_open_staging order by id")
        return [r[0] for r in cur.fetchall()]


def run_dedupe(conn):
    with conn.cursor() as cur:
        cur.execute(DDL.read_text(encoding="utf-8"))
    conn.commit()


def test_nature_pair_keeps_osm(conn):
    insert(conn, "overture:1", "overture", "Stadswandelpark", 5.4700, 51.4400, ["WALK"])
    insert(conn, "osm:n1", "osm", "Stadswandelpark", 5.4701, 51.4400, ["WALK"])
    run_dedupe(conn)
    assert ids(conn) == ["osm:n1"]


def test_commercial_pair_keeps_overture(conn):
    insert(conn, "overture:2", "overture", "Cafe Zwart", 5.4700, 51.4400, ["COFFEE"])
    insert(conn, "osm:n2", "osm", "Cafe Zwart!", 5.4701, 51.4400, ["COFFEE"])
    run_dedupe(conn)
    assert ids(conn) == ["overture:2"]       # noktalama normalize edilir


def test_accented_name_is_not_matched(conn):
    # Bilincli sinir: unaccent uzantisi yok, "Café" ile "Cafe" ayri satir kalir.
    insert(conn, "overture:6", "overture", "Cafe Zwart", 5.4700, 51.4400, ["COFFEE"])
    insert(conn, "osm:n6", "osm", "Café Zwart", 5.4701, 51.4400, ["COFFEE"])
    run_dedupe(conn)
    assert ids(conn) == ["osm:n6", "overture:6"]


def test_swap_refuses_when_staging_far_smaller_than_live(conn):
    # canli venues_open 10 satir, staging yalniz 1 satir (< %50) -> swap reddedilmeli
    with conn.cursor() as cur:
        cur.execute("drop table if exists venues_open")
        cur.execute("create table venues_open (like venues_open_staging including all)")
        for i in range(10):
            cur.execute(
                "insert into venues_open (id, source, name, geom, activity_types,"
                " confidence, updated_at) values (%s, 'osm', 'V', "
                "ST_SetSRID(ST_Point(5.47,51.44),4326), '{WALK}', 1.0, now())", (f"live:{i}",))
    conn.commit()
    insert(conn, "staging:1", "osm", "Yeni", 5.4700, 51.4400, ["WALK"])
    with pytest.raises(RuntimeError) as exc:
        db.swap(conn)
    assert "10" in str(exc.value) and "1" in str(exc.value)
