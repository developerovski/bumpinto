"""Tur basina foto kapsamasi. TripAdvisor karari (spec §5.3 / §16.2) bu sayilara bakar."""
from __future__ import annotations

SQL = """
select t as activity_type,
       count(*) as total,
       count(photo_url) as with_photo
from venues_open_staging, unnest(activity_types) t
group by 1
order by 1
"""


def rows(conn):
    with conn.cursor() as cur:
        cur.execute(SQL)
        return cur.fetchall()


def summarize(type_rows):
    """(atype, total, with_photo) satirlarindan yuzde + dusuk-kapsama bayragi hesaplar. Saf fonksiyon."""
    out = []
    for atype, total, with_photo in type_rows:
        pct = (100.0 * with_photo / total) if total else 0.0
        low = pct < 40 and atype in ("MUSEUM", "THEME_PARK", "ART")
        out.append((atype, total, with_photo, pct, low))
    return out


def report(conn) -> None:
    print("kapsama: tur / satir / fotolu / %")
    for atype, total, with_photo, pct, low in summarize(rows(conn)):
        flag = "  <-- %40 alti" if low else ""
        print(f"  {atype:<12} {total:>7} {with_photo:>7} {pct:6.1f}%{flag}")
