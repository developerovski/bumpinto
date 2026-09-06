"""wikidata_id tasiyan staging satirlari icin P18 -> Commons foto adresi."""
from __future__ import annotations

import os
import sys
import time
from urllib.parse import quote

import psycopg
import requests

import db

API = "https://www.wikidata.org/w/api.php"
BATCH = 50
FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/{file}?width=1000"


def user_agent() -> str:
    contact = os.environ.get("NOMINATIM_CONTACT", "").strip()
    if not contact:
        # Wikimedia politikasi: gercek bir iletisim adresi zorunlu, sahte UA ile ban riski.
        raise RuntimeError("NOMINATIM_CONTACT bos: Wikimedia icin gercek iletisim adresi zorunlu")
    return f"BumpInto-venues-import/1.0 ({contact})"


def chunks(items, size=BATCH):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def photo_urls(payload: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for qid, entity in (payload.get("entities") or {}).items():
        claims = (entity.get("claims") or {}).get("P18") or []
        if not claims:
            continue
        try:
            name = claims[0]["mainsnak"]["datavalue"]["value"]
        except (KeyError, TypeError):
            continue
        out[qid] = FILEPATH.format(file=quote(name, safe=""))
    return out


def fetch(session, ids: list[str]) -> dict[str, str]:
    resp = session.get(API, params={"action": "wbgetentities", "format": "json",
                                    "props": "claims", "ids": "|".join(ids)}, timeout=30)
    resp.raise_for_status()
    return photo_urls(resp.json())


def resolve(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("select distinct wikidata_id from venues_open_staging"
                    " where wikidata_id is not null and photo_url is null")
        ids = [r[0] for r in cur.fetchall()]
    print(f"wikidata: {len(ids)} kimlik cozulecek")

    session = requests.Session()
    session.headers["User-Agent"] = user_agent()
    updated = 0
    for part in chunks(ids):
        try:
            found = fetch(session, part)
        except requests.RequestException as exc:      # foto opsiyoneldir, ithal durmaz
            print(f"wikidata: parti atlandi ({exc})")
            continue
        if found:
            with conn.cursor() as cur:
                cur.executemany(
                    "update venues_open_staging set photo_url = %s where wikidata_id = %s",
                    [(url, qid) for qid, url in found.items()])
                updated += cur.rowcount if cur.rowcount and cur.rowcount > 0 else len(found)
            conn.commit()
        time.sleep(1)                                  # nazik hiz: 1 istek/sn
    print(f"wikidata: {updated} satira foto yazildi")
    return updated


def main() -> int:
    with psycopg.connect(db.dsn_from_env()) as conn:
        resolve(conn)
        import coverage
        coverage.report(conn)
    return 0


if __name__ == "__main__":
    sys.exit(main())
