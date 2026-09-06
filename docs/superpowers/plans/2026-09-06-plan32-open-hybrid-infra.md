# Açık Hibrit Yığın — Altyapı (I-2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `venues_open` tablosunu dolduran aylık ithal hattı (Overture NL + OSM NL + Wikidata foto +
tekilleştirme, staging → swap) ve backend'in konuştuğu üç açık servis (Nominatim NL, OSRM ×3,
isteğe bağlı PMTiles) — hem yerelde `docker compose` profiliyle hem kümede `deploy/k8s/` altında,
tek bir ConfigMap üzerinden.

**Architecture:** İthal hattı **uygulamanın dışında** yaşar: `tools/venues-open/` içinde Python 3.12 +
DuckDB + `osm2pgsql`, tek imaj, tek CronJob. Backend bu hattı hiç bilmez — sözleşme yalnız
`venues_open` tablosunun şekli (B-13/V11 üretir) ve `bumpinto-geo` ConfigMap'indeki env adlarıdır.
Servisler stateless Deployment + PVC: Nominatim kendi Postgres'ini taşır, OSRM veriyi bir Job'da
hazırlar ve üç `osrm-routed` aynı PVC'yi salt-okur tüketir. Yerel geliştirmede aynı servisler
`geo` compose profilinde; profil kapalıyken backend public Nominatim / haversine'e düşer
(env boşsa yedek davranış — plan 30'un sözleşmesi).

**Tech Stack:** Python 3.12, DuckDB 1.1 (spatial + httpfs), psycopg 3, PyYAML, pytest;
osm2pgsql 1.8+ (flex, Lua); PostGIS 16-3.4; `mediagis/nominatim:4.5`; `osrm/osrm-backend:v5.27.1`;
nginx 1.27; K8s (namespace `bumpinto`), GHCR.

**Spec:** `docs/superpowers/specs/2026-09-06-open-hybrid-venue-stack-design.md`
(§5.2 ithal, §7 tile yedeği, §8 geocode, §9 OSRM, §13 veri, §15 aşama tablosu I-2, §16.3/4/6/7).

**Ön koşullar (BAĞLAYICI):**
- **I-1 (Plan 5) Task 1–3 yürütülmemiştir** → `deploy/k8s/` bu planla birlikte doğar. Bu planın
  manifest'leri **kendi kendine yeterlidir**: Plan 5'ten yalnız **namespace `bumpinto`** ve
  **Secret adı `bumpinto-backend`** varsayılır. (Ara notlardaki `bumpinto-secrets` adı YANLIŞTIR;
  Plan 5 Task 3 Step 2 + README'de ad `bumpinto-backend`'dir — yeni ad uydurulmaz.)
- **B-13 (plan 30) V11 migration** `venues_open` tablosunu ve iki indeksi yaratır. Bu planın swap
  adımı `venues_open` yoksa **bilerek patlar** (sessiz tablo yaratmaz) — sıra: `B-13 V11` → `I-2 T5`.
- PostGIS uzantısı: yerelde imaj değişikliğiyle (T1), kümede **kullanıcının** tek seferlik `psql`
  komutuyla (T1 Step 5).

**Bu plana özel kurallar:**
- **Git yazma işlemi YOK.** Her görev "Değişen dosyalar" ile biter; commit kullanıcıda.
- Komutlar `rtk` önekiyle (AGENTS.md): `rtk kubectl ...`, `rtk docker ...`.
- **Yıkıcı komut ajan tarafından ÇALIŞTIRILMAZ.** `docker compose down -v`, `kubectl delete pvc`,
  `DROP DATABASE` gibi her satır **KULLANICI ÇALIŞTIRIR** etiketiyle sunulur.
- Sır **değerleri** hiçbir dosyaya yazılmaz; manifest yalnız Secret **adını** referanslar.
  `.env`/`env.sh` okunmaz.
- Python testleri: `tools/venues-open/` kökünden
  `python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m pytest -q`
  Aşağıda kısaca `PY_TEST` yazılır; ajan tam komutu kullanır.
- Manifest kapısı: `rtk kubectl apply --dry-run=client -f <dosya>` — her manifest görevinin son adımı.
  Küme erişimi yoksa `--dry-run=client` yerine `rtk kubectl apply --dry-run=client --validate=false -f`
  ile en azından YAML/şema hatası yakalanır; bu durum adımda not düşülür.
- Yorumlar kısa, Türkçe. Yeni dosya yalnız aşağıdaki haritada olanlar.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `docker-compose.yml` | T1 | PostGIS imajı + `geo` / `geo-prepare` profilleri |
| `docs/CONFIGURATION.md` §2.5 | T1 | Yerel açık servis çalıştırma + hacim uyarısı |
| `tools/venues-open/requirements.txt`, `db.py`, `catmap.py`, `category_map.yml`, `overture_import.py`, `README.md` | T2 | İskelet + Overture NL ithali |
| `tools/venues-open/tests/test_db.py`, `tests/test_catmap.py`, `tests/test_overture_import.py` | T2 | DSN dönüşümü, eşleme bütünlüğü, parquet okuma |
| `tools/venues-open/osm_poi.lua`, `osm_import.sh`, `osm_stage.py`, `dedupe.sql` | T3 | OSM NL ithali + tekilleştirme |
| `tools/venues-open/tests/test_osm_stage.py`, `tests/test_dedupe.py` | T3 | Etiket→tür eşlemesi, 50 m kuralı |
| `tools/venues-open/wikidata_photos.py`, `coverage.py` | T4 | P18 foto çözümü + tür başına kapsama raporu |
| `tools/venues-open/tests/test_wikidata_photos.py` | T4 | Toplu bölme, P18 ayrıştırma, User-Agent |
| `tools/venues-open/Dockerfile`, `.dockerignore`, `run_import.sh` | T5 | İmaj + koşu sırası |
| `deploy/k8s/venues-open-import.yaml`, `.github/workflows/venues-open.yml` | T5 | CronJob + PVC + GHCR yayını |
| `deploy/k8s/nominatim.yaml`, `deploy/k8s/geo-config.yaml` | T6 | Nominatim NL + `bumpinto-geo` ConfigMap |
| `deploy/osrm/prepare.sh`, `deploy/k8s/osrm.yaml`, `deploy/k8s/osrm-refresh.yaml` | T7 | OSRM hazırlık Job'ı, 3 servis, aylık yenileme |
| `deploy/tiles/nginx.conf`, `deploy/tiles/style.json`, `deploy/k8s/tiles.yaml` | T8 | PMTiles yedeği (isteğe bağlı) |
| `deploy/k8s/README.md`, `docs/CONFIGURATION.md` §1/§7, `docs/superpowers/plans/INDEX.md`, `2026-09-01-plan5-ci-deploy.md` | T8 | Runbook, env satırları, iz kaydı, I-1 kancası |

**Kapsam DIŞI (bu planda yapılmaz, tartışılmaz):**
- **Valhalla + GTFS** toplu taşıma rotalama — TRANSIT haversine tahmini kalır (spec §9).
- **Photon** ileri arama indeksi — spec §8'de "Nominatim'den sonra isteğe bağlı ikinci adım";
  `GEOCODE_ENGINE` anahtarı yerini şimdiden açar, servis kurulmaz.
- **TripAdvisor / Terra API** — aşama 1b, B-13'ün koşullu görevi.
- **NL dışı extract** (Belçika, Almanya, Avrupa) — bbox `3.2,50.7,7.3,53.6` sabit; genişletme
  disk ve ithal süresini kat kat büyütür, ayrı karar.
- Backend kodu, Flyway migration'ı, web/mobil harita kodu — sırasıyla B-13 (plan 30) ve W-12 (plan 31).
- Prometheus/Grafana, HPA, ağ politikaları — küme genelinde ayrı iş.

---

### Task 1: PostGIS'e geçiş + yerel `geo` profili

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docs/CONFIGURATION.md` (yeni §2.5)

- [ ] **Step 1: `docker-compose.yml`'i PostGIS'e al ve profilleri ekle**

`postgres` servisinin **imajı** değişir, hacim adı (`pgdata`) ve kimlik bilgileri **aynı kalır**.
`geo` profili varsayılan `docker compose up`'ta ayağa kalkmaz; `geo-prepare` tek seferlik.

```yaml
services:
  postgres:
    # PostGIS zorunlu: venues_open geometry(Point,4326) + GiST (spec §5.2).
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: bumpinto
      POSTGRES_USER: bumpinto
      POSTGRES_PASSWORD: bumpinto
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  # --- profil: geo (acik veri servisleri, istege bagli) ---

  nominatim:
    profiles: ["geo"]
    image: mediagis/nominatim:4.5
    environment:
      PBF_URL: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
      REPLICATION_URL: https://download.geofabrik.de/europe/netherlands-updates/
      NOMINATIM_PASSWORD: nominatim
      IMPORT_WIKIPEDIA: "false"
      THREADS: "4"
    ports:
      - "8070:8080"
    shm_size: 1g
    volumes:
      - nominatimdata:/var/lib/postgresql/16/main

  osrm-car:
    profiles: ["geo"]
    image: osrm/osrm-backend:v5.27.1
    command: ["osrm-routed", "--algorithm", "mld", "/data/car/netherlands-latest.osrm"]
    ports:
      - "5001:5000"
    volumes:
      - osrmdata:/data

  osrm-bicycle:
    profiles: ["geo"]
    image: osrm/osrm-backend:v5.27.1
    command: ["osrm-routed", "--algorithm", "mld", "/data/bicycle/netherlands-latest.osrm"]
    ports:
      - "5002:5000"
    volumes:
      - osrmdata:/data

  osrm-foot:
    profiles: ["geo"]
    image: osrm/osrm-backend:v5.27.1
    command: ["osrm-routed", "--algorithm", "mld", "/data/foot/netherlands-latest.osrm"]
    ports:
      - "5003:5000"
    volumes:
      - osrmdata:/data

  # --- profil: geo-prepare (tek seferlik, ~20-40 dk) ---

  osrm-prepare:
    profiles: ["geo-prepare"]
    image: osrm/osrm-backend:v5.27.1
    entrypoint: ["/bin/bash", "/prepare.sh"]
    environment:
      PBF_URL: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
    volumes:
      - osrmdata:/data
      - ./deploy/osrm/prepare.sh:/prepare.sh:ro

volumes:
  pgdata:
  nominatimdata:
  osrmdata:
```

`deploy/osrm/prepare.sh` T7 Step 1'de yazılır; o zamana kadar `geo-prepare` profili çalışmaz
(bilinçli: aynı script hem compose hem CronJob tarafından tüketilir, iki kopya yazılmaz).

- [ ] **Step 2: Compose'u doğrula** — Run:

```
rtk docker compose config -q
rtk docker compose config --services
rtk docker compose --profile geo config --services
```

Expected: birinci komut sessiz; ikinci yalnız `postgres`; üçüncü `postgres, nominatim, osrm-car,
osrm-bicycle, osrm-foot`. `osrm-prepare` hiçbirinde görünmez (`geo-prepare` profili).

- [ ] **Step 3: Mevcut hacmi tazele — KULLANICI ÇALIŞTIRIR**

Düz `postgres:16-alpine` ile yaratılmış `pgdata` hacminde PostGIS uzantısının paylaşılan
kütüphaneleri yoktur; imaj değişse de `CREATE EXTENSION postgis` "could not open extension control
file" ile patlar. Yerel veri atılabilir olduğu için tek çözüm hacmi yeniden yaratmaktır.

```
# KULLANICI CALISTIRIR — yerel veritabanini SILER
rtk docker compose down -v
rtk docker compose up -d postgres
```

Ajan bu komutu çalıştırmaz, çıktıyı kullanıcıdan bekler.

- [ ] **Step 4: PostGIS'i yerelde doğrula** — Run:

```
rtk docker compose exec -T postgres psql -U bumpinto -d bumpinto \
  -c "create extension if not exists postgis;" -c "select postgis_full_version();"
```

Expected: `CREATE EXTENSION` (ya da NOTICE: already exists) ve `POSTGIS="3.4..." ... GEOS ... PROJ ...`
satırı. Bu, spec §16.3'ün yerel yarısıdır.

- [ ] **Step 5: Küme tarafı için komutu hazırla — KULLANICI ÇALIŞTIRIR**

Kümedeki Postgres bu planın yönettiği bir kurulum değil (Plan 5: "kullanıcının mevcut kurulumu").
V11'in `CREATE EXTENSION IF NOT EXISTS postgis` satırının çalışabilmesi için uygulama kullanıcısının
uzantı yetkisi gerekir. **Tek seferlik**, süper kullanıcıyla:

```
# KULLANICI CALISTIRIR — kume yoneticisi, bir kez
psql "postgresql://<superuser>@<pg-host>:5432/bumpinto" \
  -c "create extension if not exists postgis;" \
  -c "select postgis_full_version();"
```

Uzantı süper kullanıcı tarafından bir kez kurulduğunda V11'deki `IF NOT EXISTS` no-op olur ve
`bumpinto` kullanıcısına ekstra yetki gerekmez. Uzantı **hiç** kurulamıyorsa (yönetilen Postgres,
kısıtlı imaj) spec §16.3'ün yedek yolu devreye girer: `venues_open` `lat/lng` + bbox + haversine
ile çalışır, V11 buna göre yazılır — bu kararı **kullanıcı** verir, ajan varsaymaz.

- [ ] **Step 6: `docs/CONFIGURATION.md`'e §2.5 ekle** (§2.4 Web'den sonra)

```markdown
### 2.5 Açık veri servisleri (isteğe bağlı)

Varsayılan `docker compose up -d postgres` yalnız PostGIS'i kaldırır; backend geocode ve rota
env'leri boşken public Nominatim'e ve haversine tahminine düşer. Gerçek servisleri istersen:

```bash
# OSRM verisini bir kez hazirla (~20-40 dk, ~6 GB disk)
docker compose --profile geo-prepare run --rm osrm-prepare

# Servisleri kaldir
docker compose --profile geo up -d
```

| Servis | Yerel adres | İlk açılış |
|---|---|---|
| Nominatim NL | `http://localhost:8070` | **1–3 saat** ithal (konteyner log'unda `Import finished`) |
| OSRM car / bicycle / foot | `http://localhost:5001` / `:5002` / `:5003` | hazırlık bitmişse saniyeler |

`backend/.env.local`'e:

```
GEOCODE_BASE_URL=http://localhost:8070
GEOCODE_ENGINE=nominatim
OSRM_CAR_URL=http://localhost:5001
OSRM_BICYCLE_URL=http://localhost:5002
OSRM_FOOT_URL=http://localhost:5003
```

> **Uyarı:** `postgres` imajı `postgis/postgis:16-3.4`'e geçti. Düz `postgres:16-alpine` ile
> yaratılmış eski `pgdata` hacmi PostGIS taşımaz; `docker compose down -v` ile **yerel veriyi
> silerek** yeniden yaratman gerekir.
```

- [ ] **Step 7: Değişen dosyalar**
- `docker-compose.yml`
- `docs/CONFIGURATION.md`

---

### Task 2: `tools/venues-open` iskeleti + Overture NL ithali

**Files:**
- Create: `tools/venues-open/requirements.txt`
- Create: `tools/venues-open/db.py`
- Create: `tools/venues-open/catmap.py`
- Create: `tools/venues-open/category_map.yml`
- Create: `tools/venues-open/overture_import.py`
- Create: `tools/venues-open/README.md`
- Create: `tools/venues-open/tests/test_db.py`
- Create: `tools/venues-open/tests/test_catmap.py`
- Create: `tools/venues-open/tests/test_overture_import.py`
- Modify: `.gitignore` (`tools/venues-open/.venv/`, `tools/venues-open/work/`)

- [ ] **Step 1: Başarısız testleri yaz** — `tests/test_db.py`

JDBC URL → psycopg DSN dönüşümü gerçek bir dikiştir: Secret `DB_URL`'i `jdbc:postgresql://...`
biçiminde taşır (Plan 5 README), psycopg ve `osm2pgsql` bunu anlamaz. Testsiz bırakılmaz.

```python
import pytest
from db import dsn_from_jdbc, staging_index_sql


def test_dsn_from_jdbc_basic():
    dsn = dsn_from_jdbc("jdbc:postgresql://pg:5432/bumpinto", "bumpinto", "s3cr3t")
    assert dsn == "postgresql://bumpinto:s3cr3t@pg:5432/bumpinto"


def test_dsn_from_jdbc_default_port_and_params():
    dsn = dsn_from_jdbc("jdbc:postgresql://pg/bumpinto?sslmode=require", "u", "p")
    assert dsn == "postgresql://u:p@pg:5432/bumpinto?sslmode=require"


def test_dsn_from_jdbc_escapes_password():
    dsn = dsn_from_jdbc("jdbc:postgresql://pg:5432/db", "u", "p@ss/word")
    assert "p%40ss%2Fword" in dsn
    assert "@pg:5432" in dsn


def test_dsn_from_jdbc_rejects_non_jdbc():
    with pytest.raises(ValueError):
        dsn_from_jdbc("postgresql://pg/db", "u", "p")


def test_staging_index_names_are_temporary():
    # V11 adlari swap SONRASI verilir; staging'de kullanilirsa eski tabloyla catisir.
    sql = staging_index_sql()
    assert "venues_open_staging_geom_gist" in sql
    assert "venues_open_staging_activity_types_gin" in sql
```

Run: `PY_TEST` → dört test `ImportError` ile kırmızı (dosya yok).

- [ ] **Step 2: `requirements.txt`** (sürümler sabit — CronJob imajı tekrarlanabilir olmalı)

```
duckdb==1.1.3
psycopg[binary]==3.2.3
requests==2.32.3
PyYAML==6.0.2
pytest==8.3.4
```

- [ ] **Step 3: `db.py`**

```python
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
_STAGING_INDEXES = """
create index venues_open_staging_geom_gist
  on venues_open_staging using gist (geom);
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
    with conn.cursor() as cur:
        cur.execute("select to_regclass('public.venues_open')")
        if cur.fetchone()[0] is None:
            raise RuntimeError(
                "venues_open yok: once backend V11 migration'i kosmali (B-13). Swap iptal."
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
```

Run: `PY_TEST` → `test_db.py` yeşil.

- [ ] **Step 4: `category_map.yml`** — 15 `ActivityType`, iki dünya

`backend/src/main/resources/venue-sources/open.yml` (B-13 üretir) bu dosyanın aynadaki eşidir;
biri değişince diğeri değişir. Overture slug'ları **en iyi bilinen** taksonomi adlarıdır;
ilk ithal tür başına sayım bastığı için yanlış slug **sıfır satır** olarak anında görünür ve
burada düzeltilir (spec §16.7).

```yaml
# ActivityType -> acik veri kategorileri.
# overture: categories.primary slug'lari  |  osm: "<key>=<value>" ciftleri
# NOT: ilk ithal tur basina sayim basar; 0 cikan slug yanlistir, burada duzeltilir (spec §16.7).
COFFEE:
  overture: [cafe, coffee_shop]
  osm: []
FOOD:
  overture: [restaurant, fast_food_restaurant]
  osm: []
BAR:
  overture: [bar, pub]
  osm: []
NIGHTLIFE:
  overture: [night_club, dance_club]
  osm: []
MUSEUM:
  overture: [museum]
  osm: ["tourism=museum"]
THEME_PARK:
  overture: [amusement_park, water_park, zoo]
  osm: ["tourism=theme_park", "tourism=zoo"]
ART:
  overture: [art_gallery, arts_and_entertainment]
  osm: ["tourism=gallery", "amenity=arts_centre"]
WALK:
  overture: [park]
  osm: ["leisure=park", "tourism=attraction"]
HIKE:
  overture: [hiking_trail, nature_preserve]
  osm: ["leisure=nature_reserve", "route=hiking"]
SWIM:
  overture: [swimming_pool, beach]
  osm: ["leisure=swimming_pool"]
FITNESS:
  overture: [gym, fitness_center]
  osm: ["leisure=fitness_centre", "sport=fitness"]
CINEMA:
  overture: [movie_theater]
  osm: ["amenity=cinema"]
GAMES:
  overture: [bowling_alley, arcade, escape_room]
  osm: ["leisure=bowling_alley", "leisure=amusement_arcade"]
ADVENTURE:
  overture: [climbing_gym, go_kart_track]
  osm: ["sport=climbing", "sport=swimming"]
ACTIVITY:
  overture: [recreation_center, community_center]
  osm: ["leisure=sports_centre"]
```

Yiyecek/içecek türlerinde `osm: []` bilinçli: ticari POI'de Overture (FSQ kaynaklı) daha zengin
ve zaten FSQ birincil sağlayıcı (spec §3 yönlendirme tablosu). OSM'in katkısı park/doğa/müze
tarafındadır; `sport=*` yalnız `leisure=sports_centre` üzerinde anlam taşır ve Lua bu iki etiketi
birlikte tutar (T3).

- [ ] **Step 5: `tests/test_catmap.py`**

```python
import catmap

TYPES = ["COFFEE", "FOOD", "BAR", "NIGHTLIFE", "MUSEUM", "THEME_PARK", "ART", "WALK",
         "HIKE", "SWIM", "FITNESS", "CINEMA", "GAMES", "ADVENTURE", "ACTIVITY"]


def test_all_fifteen_types_present():
    m = catmap.load()
    assert sorted(m) == sorted(TYPES)


def test_every_type_has_at_least_one_source():
    m = catmap.load()
    for t, entry in m.items():
        assert entry["overture"] or entry["osm"], t


def test_overture_index_is_inverted():
    idx = catmap.overture_index()
    assert "WALK" in idx["park"]
    assert "CINEMA" in idx["movie_theater"]


def test_osm_pairs_are_key_value():
    for key, value, atype in catmap.osm_pairs():
        assert key and value and atype in TYPES
```

- [ ] **Step 6: `catmap.py`**

```python
"""category_map.yml yukleyici. Overture slug -> tur, OSM etiket cifti -> tur."""
from __future__ import annotations

import functools
import pathlib

import yaml

PATH = pathlib.Path(__file__).with_name("category_map.yml")


@functools.lru_cache(maxsize=1)
def load(path: pathlib.Path | None = None) -> dict[str, dict[str, list[str]]]:
    raw = yaml.safe_load((path or PATH).read_text(encoding="utf-8"))
    return {t: {"overture": e.get("overture") or [], "osm": e.get("osm") or []}
            for t, e in raw.items()}


def overture_index() -> dict[str, list[str]]:
    idx: dict[str, list[str]] = {}
    for atype, entry in load().items():
        for slug in entry["overture"]:
            idx.setdefault(slug, []).append(atype)
    return idx


def osm_pairs() -> list[tuple[str, str, str]]:
    out = []
    for atype, entry in load().items():
        for pair in entry["osm"]:
            key, _, value = pair.partition("=")
            out.append((key, value, atype))
    return out
```

Run: `PY_TEST` → `test_catmap.py` yeşil.

- [ ] **Step 7: `tests/test_overture_import.py`** — DuckDB ile üretilen küçük parquet

Gerçek S3 sürümüne bağlı test kırılgan ve yavaş olur; okuma fonksiyonu kaynak yolunu parametre
aldığı için testte **Overture şemasının aynısına sahip** iki satırlık yerel bir parquet üretilir.

```python
import duckdb
import pytest

from overture_import import NL_BBOX, read_places, to_rows

FIXTURE_SQL = """
copy (
  select * from (values
    ('ovt-park', {{'primary': 'Stadswandelpark'}}, {{'primary': 'park'}}, 0.93::float,
     ST_AsWKB(ST_Point(5.4700, 51.4400)),
     {{'xmin': 5.47::float, 'xmax': 5.47::float, 'ymin': 51.44::float, 'ymax': 51.44::float}},
     ['https://park.example'], [{{'locality': 'Eindhoven', 'freeform': 'Parklaan 1'}}]),
    ('ovt-berlin', {{'primary': 'Tiergarten'}}, {{'primary': 'park'}}, 0.90::float,
     ST_AsWKB(ST_Point(13.35, 52.51)),
     {{'xmin': 13.35::float, 'xmax': 13.35::float, 'ymin': 52.51::float, 'ymax': 52.51::float}},
     [], []),
    ('ovt-unknown', {{'primary': 'Kantoor'}}, {{'primary': 'office_supply_store'}}, 0.99::float,
     ST_AsWKB(ST_Point(5.48, 51.45)),
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


def test_bbox_filters_out_of_country_rows(places_parquet):
    con, path = places_parquet
    ids = [r["id"] for r in read_places(con, path, NL_BBOX)]
    assert "ovt-park" in ids
    assert "ovt-berlin" not in ids       # Berlin bbox disinda


def test_unmapped_category_is_dropped(places_parquet):
    con, path = places_parquet
    rows = to_rows(read_places(con, path, NL_BBOX))
    assert [r[0] for r in rows] == ["overture:ovt-park"]


def test_row_shape_matches_staging_columns(places_parquet):
    con, path = places_parquet
    (row,) = to_rows(read_places(con, path, NL_BBOX))
    assert row[1] == "overture"
    assert row[2] == "Stadswandelpark"
    assert row[3] == "SRID=4326;POINT(5.47 51.44)"
    assert row[5] == "{WALK}"
    assert row[7] == "https://park.example"
    assert row[11] == "Eindhoven"
```

Run: `PY_TEST` → üç test kırmızı.

- [ ] **Step 8: `overture_import.py`**

```python
"""Overture Places NL -> venues_open_staging. DuckDB okur, COPY yazar."""
from __future__ import annotations

import io
import os
import sys

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
    with conn.cursor() as cur:
        with cur.copy(f"copy venues_open_staging ({cols}) from stdin") as cp:
            for r in rows:
                cp.write_row(r + ("now()",))
    conn.commit()


def report(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            select t, count(*) from venues_open_staging, unnest(activity_types) t
            where source = 'overture' group by 1 order by 1
        """)
        counts = cur.fetchall()
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
```

`report` içindeki ikinci `cur.fetchall()` boş döner (imleç tükendi) — düzelt: sonuçları bir kez
listeye al, hem yazdır hem eksikleri hesapla. Ajan bu düzeltmeyi uygularken testi de ekler:
`test_report_lists_missing_types` (fake conn ile). *Bu adım bilinçli olarak bırakılmış bir hatadır
değil — yazarken düzeltilir; `rows = cur.fetchall()` bir kere.*

Run: `PY_TEST` → tüm testler yeşil.

- [ ] **Step 9: `README.md` (koşu sırası)**

```markdown
# venues-open — açık veri ithal hattı

`venues_open` tablosunu Overture Places NL + OSM NL'den yeniden üretir. Uygulamadan bağımsızdır;
tek sözleşmesi tablo şeması (backend V11) ve `DB_URL` / `DB_USER` / `DB_PASSWORD`.

## Koşu sırası (`run_import.sh` bunu uygular)

1. `db.create_staging` — `venues_open_staging` sıfırdan yaratılır
2. `overture_import.py` — Overture NL (ticari POI, `confidence`, website, adres)
3. `osm_import.sh` — Geofabrik NL pbf → `osm2pgsql` flex → `osm_stage.py` → staging
4. `dedupe.sql` — aynı ad + 50 m: kategoriye göre kazanan seçilir
5. `wikidata_photos.py` — P18 → Commons `Special:FilePath`, tür başına kapsama raporu
6. `db.create_staging_indexes` — GiST + GIN (geçici adlarla)
7. `db.swap` — tek transaction: rename → drop → indeks adlarını V11 adlarına al → `analyze`

Adım 7 `venues_open` yoksa **bilerek patlar**: önce backend V11 migration'ı koşmalı.

## Yerel çalıştırma

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
export DB_URL=jdbc:postgresql://localhost:5432/bumpinto DB_USER=bumpinto DB_PASSWORD=bumpinto
export NOMINATIM_CONTACT='sen@ornek.com'
.venv/bin/python -m pytest -q          # testler
./run_import.sh                        # tam hat (osm2pgsql gerekir)
```

Yalnız Overture denemek için: `.venv/bin/python overture_import.py`.

## Kategori eşlemesi

`category_map.yml` 15 `ActivityType`'ı Overture slug'larına ve OSM etiket çiftlerine bağlar.
`backend/src/main/resources/venue-sources/open.yml` bunun aynasıdır — biri değişince diğeri.
İlk ithal tür başına sayım basar; 0 satır dönen bir slug yanlış yazılmıştır.
```

- [ ] **Step 10: `.gitignore`'a iki satır**

```
tools/venues-open/.venv/
tools/venues-open/work/
```

- [ ] **Step 11: Değişen dosyalar**
- `tools/venues-open/requirements.txt`, `db.py`, `catmap.py`, `category_map.yml`,
  `overture_import.py`, `README.md`
- `tools/venues-open/tests/test_db.py`, `tests/test_catmap.py`, `tests/test_overture_import.py`
- `.gitignore`

---

### Task 3: OSM NL ithali + tekilleştirme

**Files:**
- Create: `tools/venues-open/osm_poi.lua`
- Create: `tools/venues-open/osm_import.sh`
- Create: `tools/venues-open/osm_stage.py`
- Create: `tools/venues-open/dedupe.sql`
- Create: `tools/venues-open/tests/test_osm_stage.py`
- Create: `tools/venues-open/tests/test_dedupe.py`
- Modify: `tools/venues-open/README.md` (test önkoşulu notu)

**Test kararı (açıkça):** `.osm.pbf` fixture'ı **yazılmaz**. Küçük bir pbf üretmek `osmium`/
`osmosis` ikili bağımlılığı gerektirir, ürettiği dosya ikili olarak depoya girer ve Lua stilini
uçtan uca koşturmak için `osm2pgsql` binary'si de şart olur — üç yeni CI bağımlılığı, tek bir
eşleme kuralı için. Yerine iki gerçek test:
1. **`osm_stage.py`** SQL'i, `osm_poi_raw`'a **doğrudan yazılmış** satırlarla Postgres'te koşar.
2. **`dedupe.sql`**, staging'e **doğrudan yazılmış** satır çiftleriyle koşar (50 m kuralı, kaynak
   tercihi, farklı ad → dokunulmaz).
Lua dosyası için gate sözdizimi denetimidir (`luac -p`) — davranışı ilk gerçek ithalin
tür başına sayımı doğrular.

Her iki test de `TEST_DB_URL` env'i yoksa `pytest.skip` eder (yerelde compose Postgres'i,
CI'da servis konteyneri).

- [ ] **Step 1: `tests/test_dedupe.py` yaz (kırmızı)**

```python
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


def test_far_apart_rows_survive(conn):
    insert(conn, "overture:3", "overture", "Cafe Zwart", 5.4700, 51.4400, ["COFFEE"])
    insert(conn, "osm:n3", "osm", "Cafe Zwart", 5.4900, 51.4400, ["COFFEE"])  # ~1.4 km
    run_dedupe(conn)
    assert ids(conn) == ["osm:n3", "overture:3"]


def test_same_source_pair_is_not_touched(conn):
    insert(conn, "osm:n4", "osm", "Park", 5.4700, 51.4400, ["WALK"])
    insert(conn, "osm:n5", "osm", "Park", 5.4701, 51.4400, ["WALK"])
    run_dedupe(conn)
    assert ids(conn) == ["osm:n4", "osm:n5"]
```

Beş test iki farklı şeyi kanıtlar: normalize **noktalamayı** siler (`Cafe Zwart!` eşleşir) ama
**aksanı çevirmez** (`Café Zwart` eşleşmez, `é` de alfanumeriktir). İkincisi bilinçli bir sınırdır —
aksan çevirisi `unaccent` uzantısı ister, tek bir ad varyantı için uzantı bağımlılığı büyütmeye
değmez; `dedupe.sql` başına aynı not düşülür.

- [ ] **Step 2: `dedupe.sql`**

```sql
-- Ayni normalize ad + 50 m: kaybeden satir atilir.
-- Ticari kategoride Overture, bos zaman/doga kategorisinde OSM kazanir (spec §5.2).
-- SINIR: normalize yalnizca alfanumerik birakir, aksan cevirmez (unaccent uzantisi
-- istemiyoruz). "Cafe" ile "Café" ayri satir kalir; kabul edilen kayip.

create temporary table dedupe_losers on commit drop as
with n as (
  select id, source, geom,
         lower(regexp_replace(name, '[^[:alnum:]]', '', 'g')) as nname,
         activity_types && array['WALK','HIKE','SWIM','FITNESS','THEME_PARK'] as nature
  from venues_open_staging
)
select case
         when a.nature or b.nature
           then case when a.source = 'osm' then b.id else a.id end
         else case when a.source = 'overture' then b.id else a.id end
       end as id
from n a
join n b
  on a.id < b.id
 and a.nname = b.nname
 and length(a.nname) >= 3
 and a.source <> b.source
 and ST_DWithin(a.geom::geography, b.geom::geography, 50);

delete from venues_open_staging where id in (select id from dedupe_losers);
```

`on commit drop` geçici tabloyu transaction sonunda düşürür; `psql -1 -f dedupe.sql` ile
çalıştırılır (tek transaction). Test de aynı transaction bütünlüğünü kullanır.

Run: `TEST_DB_URL=jdbc:postgresql://localhost:5432/bumpinto` ile `PY_TEST` → `test_dedupe.py` yeşil.

- [ ] **Step 3: `osm_poi.lua`** (osm2pgsql flex stili)

```lua
-- osm2pgsql flex: yalniz POI etiketleri, cikti osm_poi_raw.
-- Alan/iliski geometrileri centroid'e indirgenir (venues_open Point tasir).

local poi = osm2pgsql.define_table({
  name = 'osm_poi_raw',
  ids = { type = 'any', id_column = 'osm_id', type_column = 'osm_type' },
  columns = {
    { column = 'name', type = 'text', not_null = true },
    { column = 'tags', type = 'jsonb' },
    { column = 'geom', type = 'point', projection = 4326, not_null = true },
  }
})

local wanted = {
  leisure = { park = true, swimming_pool = true, sports_centre = true,
              fitness_centre = true, nature_reserve = true, bowling_alley = true,
              amusement_arcade = true },
  tourism = { museum = true, theme_park = true, zoo = true, gallery = true,
              attraction = true },
  amenity = { cinema = true, arts_centre = true },
}

-- category_map.yml'e giden ve kartta kullanilan etiketler; gerisi atilir.
local keep = { 'name', 'wikidata', 'wikimedia_commons', 'image', 'opening_hours',
               'website', 'addr:city', 'leisure', 'tourism', 'amenity', 'sport', 'route' }

local function matches(tags)
  for key, values in pairs(wanted) do
    local v = tags[key]
    if v ~= nil and values[v] then return true end
  end
  -- sport=* yalniz sports_centre uzerinde anlamli
  if tags.sport ~= nil and tags.leisure == 'sports_centre' then return true end
  return false
end

local function slim(tags)
  local out = {}
  for _, k in ipairs(keep) do
    if tags[k] ~= nil then out[k] = tags[k] end
  end
  return out
end

local function add(tags, geom)
  poi:insert({ name = tags.name, tags = slim(tags), geom = geom })
end

function osm2pgsql.process_node(object)
  if object.tags.name == nil or not matches(object.tags) then return end
  add(object.tags, object:as_point())
end

function osm2pgsql.process_way(object)
  if object.tags.name == nil or not matches(object.tags) then return end
  if not object.is_closed then return end
  add(object.tags, object:as_polygon():centroid())
end

function osm2pgsql.process_relation(object)
  local t = object.tags
  if t.name == nil then return end
  if t.route == 'hiking' then
    add(t, object:as_multilinestring():centroid())
    return
  end
  if t.type == 'multipolygon' and matches(t) then
    add(t, object:as_multipolygon():centroid())
  end
end
```

- [ ] **Step 4: Lua sözdizimi kapısı** — Run:

```
luac -p tools/venues-open/osm_poi.lua && echo LUA_OK
```

Expected: `LUA_OK`. `luac` yoksa `brew install lua` (macOS) / imajda `apt-get install -y lua5.4`.
Bu bir sözdizimi kapısıdır, davranış kanıtı değil — davranışı ilk ithalin sayım raporu doğrular.

- [ ] **Step 5: `tests/test_osm_stage.py` yaz (kırmızı)**

```python
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
        cur.execute("select id, activity_types, wikidata_id, source, confidence"
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
    raw(conn, 2, "W", "Sportcomplex", {"leisure": "sports_centre", "sport": "fitness"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert sorted(row[1]) == ["ACTIVITY", "FITNESS"]


def test_wikidata_tag_is_carried(conn):
    raw(conn, 3, "N", "Van Abbemuseum", {"tourism": "museum", "wikidata": "Q1815688"})
    osm_stage.stage(conn)
    (row,) = staged(conn)
    assert row[2] == "Q1815688"


def test_unmapped_tag_is_dropped(conn):
    raw(conn, 4, "N", "Kantoor", {"office": "company"})
    osm_stage.stage(conn)
    assert staged(conn) == []
```

- [ ] **Step 6: `osm_stage.py`**

```python
"""osm_poi_raw -> venues_open_staging. Eslesme category_map.yml'den gelir."""
from __future__ import annotations

import sys

import psycopg

import catmap
import db

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


def stage(conn) -> int:
    pairs = catmap.osm_pairs()
    values = ",".join(["(%s,%s,%s)"] * len(pairs))
    params = [x for pair in pairs for x in pair]
    with conn.cursor() as cur:
        cur.execute(SQL.format(values=values), params)
        inserted = cur.rowcount
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
```

Run: `TEST_DB_URL=... PY_TEST` → `test_osm_stage.py` yeşil.

- [ ] **Step 7: `osm_import.sh`**

```bash
#!/usr/bin/env bash
# Geofabrik NL pbf -> osm2pgsql flex -> osm_poi_raw -> staging
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${WORK_DIR:-/work}"
PBF_URL="${PBF_URL:-https://download.geofabrik.de/europe/netherlands-latest.osm.pbf}"
PBF="$WORK/netherlands-latest.osm.pbf"
CACHE_MB="${OSM2PGSQL_CACHE_MB:-2000}"

DSN="$(python3 "$HERE/db.py" --dsn)"

osm2pgsql --version | head -1

mkdir -p "$WORK"
if [ ! -s "$PBF" ]; then
  echo "osm: pbf indiriliyor ($PBF_URL)"
  curl -sSfL -o "$PBF" "$PBF_URL"
fi

psql "$DSN" -v ON_ERROR_STOP=1 -q -c 'drop table if exists osm_poi_raw'

osm2pgsql \
  --output=flex \
  --style "$HERE/osm_poi.lua" \
  --database "$DSN" \
  --slim --drop \
  --cache "$CACHE_MB" \
  "$PBF"

python3 "$HERE/osm_stage.py"
```

`--slim --drop` orta tabloları koşu sonunda düşürür (aylık tam ithal, artımlı güncelleme yok).
`osm2pgsql --version` ilk satırı log'a düşer: flex çıktısı 1.4+ ister, sürüm görünür olsun.

- [ ] **Step 8: `README.md`'ye test önkoşulu notu ekle**

```markdown
## Testler

```bash
docker compose up -d postgres        # repo kokunden
export TEST_DB_URL=jdbc:postgresql://localhost:5432/bumpinto
.venv/bin/python -m pytest -q
```

`TEST_DB_URL` yoksa Postgres isteyen testler `skip` olur; saf Python testleri her koşulda koşar.
```

- [ ] **Step 9: Değişen dosyalar**
- `tools/venues-open/osm_poi.lua`, `osm_import.sh`, `osm_stage.py`, `dedupe.sql`
- `tools/venues-open/tests/test_osm_stage.py`, `tests/test_dedupe.py`
- `tools/venues-open/README.md`

---

### Task 4: Wikidata foto çözümü + kapsama raporu

**Files:**
- Create: `tools/venues-open/wikidata_photos.py`
- Create: `tools/venues-open/coverage.py`
- Create: `tools/venues-open/tests/test_wikidata_photos.py`

- [ ] **Step 1: Testleri yaz (kırmızı)** — `tests/test_wikidata_photos.py`

Ağ **yok**: bölme, ayrıştırma ve User-Agent saf fonksiyonlardır.

```python
import pytest

import wikidata_photos as wp


def test_chunks_of_fifty():
    ids = [f"Q{i}" for i in range(120)]
    parts = list(wp.chunks(ids, 50))
    assert [len(p) for p in parts] == [50, 50, 20]


def test_photo_urls_builds_commons_filepath():
    payload = {"entities": {"Q1815688": {"claims": {"P18": [
        {"mainsnak": {"datavalue": {"value": "Van Abbemuseum 01.jpg"}}}]}}}}
    assert wp.photo_urls(payload) == {
        "Q1815688":
        "https://commons.wikimedia.org/wiki/Special:FilePath/Van%20Abbemuseum%2001.jpg?width=1000"
    }


def test_photo_urls_skips_entities_without_p18():
    payload = {"entities": {"Q1": {"claims": {}}, "Q2": {"missing": ""}}}
    assert wp.photo_urls(payload) == {}


def test_photo_urls_takes_first_claim_only():
    claims = [{"mainsnak": {"datavalue": {"value": "a.jpg"}}},
              {"mainsnak": {"datavalue": {"value": "b.jpg"}}}]
    payload = {"entities": {"Q3": {"claims": {"P18": claims}}}}
    assert "a.jpg" in wp.photo_urls(payload)["Q3"]


def test_user_agent_carries_contact(monkeypatch):
    monkeypatch.setenv("NOMINATIM_CONTACT", "sen@ornek.com")
    assert "sen@ornek.com" in wp.user_agent()


def test_user_agent_requires_contact(monkeypatch):
    monkeypatch.delenv("NOMINATIM_CONTACT", raising=False)
    with pytest.raises(RuntimeError):
        wp.user_agent()
```

- [ ] **Step 2: `wikidata_photos.py`**

```python
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
```

- [ ] **Step 3: `coverage.py`** (spec §16.2'nin girdisi: tür başına foto kapsaması)

```python
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


def report(conn) -> None:
    print("kapsama: tur / satir / fotolu / %")
    for atype, total, with_photo in rows(conn):
        pct = (100.0 * with_photo / total) if total else 0.0
        flag = "  <-- %40 alti" if pct < 40 and atype in ("MUSEUM", "THEME_PARK", "ART") else ""
        print(f"  {atype:<12} {total:>7} {with_photo:>7} {pct:6.1f}%{flag}")
```

`MUSEUM|THEME_PARK|ART` üçlüsünde %40 altı işareti spec §5.3'ün "1b açılır mı" ölçütüdür; karar
kullanıcıda, script yalnız sayıyı basar.

Run: `PY_TEST` → altı test yeşil.

- [ ] **Step 4: Değişen dosyalar**
- `tools/venues-open/wikidata_photos.py`, `coverage.py`
- `tools/venues-open/tests/test_wikidata_photos.py`

---

### Task 5: İthal imajı + CronJob + GHCR

**Files:**
- Create: `tools/venues-open/Dockerfile`
- Create: `tools/venues-open/.dockerignore`
- Create: `tools/venues-open/run_import.sh`
- Create: `deploy/k8s/venues-open-import.yaml`
- Create: `.github/workflows/venues-open.yml`

- [ ] **Step 1: `run_import.sh`** (README'deki 7 adımın tek girişi)

```bash
#!/usr/bin/env bash
# venues_open'i sifirdan uretir: staging -> ithal -> dedupe -> foto -> indeks -> swap
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export WORK_DIR="${WORK_DIR:-/work}"
DSN="$(python3 "$HERE/db.py" --dsn)"
START=$(date +%s)

echo "== 1/7 staging semasi"
python3 -c "
import psycopg, db
with psycopg.connect(db.dsn_from_env()) as c: db.create_staging(c)"

echo "== 2/7 overture"
python3 "$HERE/overture_import.py"

echo "== 3/7 osm"
"$HERE/osm_import.sh"

echo "== 4/7 dedupe"
psql "$DSN" -v ON_ERROR_STOP=1 -q -1 -f "$HERE/dedupe.sql"

echo "== 5/7 wikidata fotolari"
python3 "$HERE/wikidata_photos.py"

echo "== 6/7 indeksler"
python3 -c "
import psycopg, db
with psycopg.connect(db.dsn_from_env()) as c: db.create_staging_indexes(c)"

echo "== 7/7 swap"
python3 -c "
import psycopg, db
with psycopg.connect(db.dsn_from_env()) as c: db.swap(c)"

echo "bitti: $(( $(date +%s) - START )) sn"
psql "$DSN" -q -c "select count(*) as venues_open_satir from venues_open"
```

- [ ] **Step 2: `Dockerfile`**

```dockerfile
FROM python:3.12-slim

# osm2pgsql (flex/Lua), psql, curl — hepsi ithal hattinin parcasi
RUN apt-get update && apt-get install -y --no-install-recommends \
      osm2pgsql postgresql-client curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x run_import.sh osm_import.sh && mkdir -p /work && chown 1000:1000 /work

USER 1000
ENV PYTHONUNBUFFERED=1 WORK_DIR=/work
ENTRYPOINT ["/app/run_import.sh"]
```

`tools/venues-open/.dockerignore`:

```
.venv/
work/
tests/
__pycache__/
```

- [ ] **Step 3: İmajı yerelde doğrula** — Run:

```
rtk docker build -t venues-open:dev tools/venues-open
rtk docker run --rm venues-open:dev --help || true
rtk docker run --rm --entrypoint osm2pgsql venues-open:dev --version
rtk docker run --rm --entrypoint python3 venues-open:dev -c "import duckdb, psycopg, yaml; print('deps ok')"
```

Expected: `osm2pgsql version 1.x` (1.4+) ve `deps ok`. Tam ithal denemesi ağ + ~20 dk ister;
kümede ilk koşuda yapılır (Step 6).

- [ ] **Step 4: `deploy/k8s/venues-open-import.yaml`**

`bumpinto-backend` Secret'ından yalnız üç anahtar okunur; script hepsini env olarak bekler.
`NOMINATIM_CONTACT` ConfigMap'ten gelir (T6'da yazılır) — CronJob iki kaynağı da bağlar.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: venues-open-work
  namespace: bumpinto
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: venues-open-import
  namespace: bumpinto
spec:
  # Ayin 1'i 03:00 — Overture aylik yayin, Geofabrik gunluk (spec §5.2)
  schedule: "0 3 1 * *"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      # 6 saat: Nominatim disi tum hat ~30-60 dk, agir gunde pay birakiyoruz
      activeDeadlineSeconds: 21600
      template:
        spec:
          restartPolicy: Never
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: 1000
          containers:
            - name: import
              image: ghcr.io/DEGISTIR_KULLANICI/bumpinto/venues-open:latest
              envFrom:
                - secretRef: { name: bumpinto-backend }
                - configMapRef: { name: bumpinto-geo }
              env:
                - name: OVERTURE_RELEASE
                  value: "2026-08-20.0"
                - name: PBF_URL
                  value: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
                - name: OSM2PGSQL_CACHE_MB
                  value: "2000"
              volumeMounts:
                - { name: work, mountPath: /work }
              resources:
                requests: { cpu: "1", memory: 3Gi }
                limits: { memory: 6Gi }
          volumes:
            - name: work
              persistentVolumeClaim:
                claimName: venues-open-work
```

`envFrom: secretRef: bumpinto-backend` Secret'ın **tüm** anahtarlarını env'e basar (`DB_URL`,
`DB_USER`, `DB_PASSWORD` dahil); script yalnız üçünü okur, fazlası zararsızdır ve Plan 5'in
Secret şemasını değiştirmez.

- [ ] **Step 5: Manifest kapısı** — Run:

```
rtk kubectl apply --dry-run=client -f deploy/k8s/venues-open-import.yaml
```

Expected: `persistentvolumeclaim/venues-open-work created (dry run)` ve
`cronjob.batch/venues-open-import created (dry run)`.

- [ ] **Step 6: İlk koşu — KULLANICI ÇALIŞTIRIR** (ajan komutu ve beklenen çıktıyı sunar)

Ön koşul: backend V11 migration'ı koşmuş olmalı (`venues_open` var), aksi halde 7/7 adımı
"venues_open yok" mesajıyla durur — bilinçli.

```
# KULLANICI CALISTIRIR
rtk kubectl -n bumpinto create job --from=cronjob/venues-open-import venues-open-manual-1
rtk kubectl -n bumpinto logs -f job/venues-open-manual-1
```

Beklenen log iskeleti (ilk koşu ~10 dk Overture + ~15 dk OSM + ~5 dk Wikidata):

```
== 1/7 staging semasi
== 2/7 overture
overture: 214xxx okundu, 6xxxx eslesti
overture: tur basina satir
  ART           1xxx
  ...
== 3/7 osm
osm2pgsql version 1.11.0
osm: 4xxxx satir staging'e yazildi
== 4/7 dedupe
== 5/7 wikidata fotolari
kapsama: tur / satir / fotolu / %
  MUSEUM         xxx    xxx   xx.x%
== 7/7 swap
bitti: 18xx sn
venues_open_satir | 9xxxx
```

**Bu çıktı spec §16.7'yi kapatır** (tür başına Overture sayımı) ve §16.2'nin girdisini verir
(müze/tema/sanat foto kapsaması). Sıfır satır dönen bir tür varsa `category_map.yml`'deki slug
yanlıştır → düzelt, imajı yeniden yayınla, işi tekrar koş.

- [ ] **Step 7: `.github/workflows/venues-open.yml`** (I-1'in GHCR desenine birebir)

```yaml
name: venues-open

on:
  push:
    branches: [main]
    paths: ["tools/venues-open/**", ".github/workflows/venues-open.yml"]
  pull_request:
    paths: ["tools/venues-open/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: bumpinto
          POSTGRES_USER: bumpinto
          POSTGRES_PASSWORD: bumpinto
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U bumpinto" --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      TEST_DB_URL: jdbc:postgresql://localhost:5432/bumpinto
      NOMINATIM_CONTACT: ci@bumpinto.test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Bagimliliklar
        working-directory: tools/venues-open
        run: pip install -r requirements.txt
      - name: Lua sozdizimi
        run: sudo apt-get update && sudo apt-get install -y lua5.4 && luac5.4 -p tools/venues-open/osm_poi.lua
      - name: Testler
        working-directory: tools/venues-open
        run: python -m pytest -q

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: tools/venues-open
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/venues-open:latest
            ghcr.io/${{ github.repository }}/venues-open:${{ github.sha }}
```

- [ ] **Step 8: Değişen dosyalar**
- `tools/venues-open/Dockerfile`, `.dockerignore`, `run_import.sh`
- `deploy/k8s/venues-open-import.yaml`
- `.github/workflows/venues-open.yml`

---

### Task 6: Nominatim NL + `bumpinto-geo` ConfigMap

**Files:**
- Create: `deploy/k8s/geo-config.yaml`
- Create: `deploy/k8s/nominatim.yaml`

- [ ] **Step 1: `deploy/k8s/geo-config.yaml`** — backend'in (B-13/W-12) okuduğu tek yer

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bumpinto-geo
  namespace: bumpinto
data:
  # Geocode (spec §8) — bos birakilirsa backend public Nominatim'e duser
  GEOCODE_BASE_URL: "http://nominatim:8080"
  GEOCODE_ENGINE: "nominatim"
  NOMINATIM_CONTACT: "DEGISTIR@bumpinto.app"   # Wikimedia + Nominatim politikasi: gercek adres

  # Rota (spec §9) — bos birakilirsa TravelMinutes haversine tahminine duser
  OSRM_CAR_URL: "http://osrm-car:5000"
  OSRM_BICYCLE_URL: "http://osrm-bicycle:5000"
  OSRM_FOOT_URL: "http://osrm-foot:5000"

  # Harita motoru (spec §7) — kendi tile'ina gecis YALNIZ bu satiri degistirir
  MAP_ENGINE: "maplibre"
  MAP_TILES_STYLE_URL: "https://tiles.openfreemap.org/styles/positron"

  # Saklama + butce (spec §6, §11)
  RETENTION_ENABLED: "true"
  FSQ_PREMIUM_MONTHLY_BUDGET: "5000"
```

Bu ConfigMap **sır taşımaz** (hepsi küme içi adres ya da public URL); anahtarlar Secret'ta kalır.
`NOMINATIM_CONTACT`'taki `DEGISTIR@bumpinto.app` kullanıcının değiştireceği tek satırdır.

- [ ] **Step 2: `deploy/k8s/nominatim.yaml`**

`mediagis/nominatim` kendi Postgres'ini konteynerin içinde taşır; PVC o veritabanının dizinidir.
İlk açılışta pbf indirir ve ithal eder (1–3 saat) — bu yüzden `startupProbe` uzun, `readinessProbe`
kısa tutulur ve `strategy: Recreate` (RWO PVC iki pod'a bağlanamaz).

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nominatim-data
  namespace: bumpinto
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nominatim
  namespace: bumpinto
spec:
  replicas: 1
  strategy: { type: Recreate }   # RWO PVC: iki pod ayni anda baglanamaz
  selector:
    matchLabels: { app: nominatim }
  template:
    metadata:
      labels: { app: nominatim }
    spec:
      containers:
        - name: nominatim
          image: mediagis/nominatim:4.5
          ports: [{ containerPort: 8080 }]
          env:
            - name: PBF_URL
              value: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
            - name: REPLICATION_URL
              value: https://download.geofabrik.de/europe/netherlands-updates/
            - name: IMPORT_WIKIPEDIA
              value: "false"
            - name: THREADS
              value: "4"
            - name: NOMINATIM_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bumpinto-backend
                  key: DB_PASSWORD      # konteyner ici Postgres; disariya acilmaz
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/16/main }
            - { name: dshm, mountPath: /dev/shm }
          startupProbe:
            httpGet: { path: /status, port: 8080 }
            periodSeconds: 60
            failureThreshold: 240        # ilk ithal icin 4 saat pay
          readinessProbe:
            httpGet: { path: /status, port: 8080 }
            periodSeconds: 15
            failureThreshold: 4
          resources:
            requests: { cpu: "1", memory: 4Gi }
            limits: { memory: 8Gi }
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: nominatim-data
        - name: dshm
          emptyDir:
            medium: Memory
            sizeLimit: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nominatim
  namespace: bumpinto
spec:
  selector: { app: nominatim }
  ports: [{ port: 8080, targetPort: 8080 }]
```

`/dev/shm` emptyDir'i şart: Postgres'in paralel ithali varsayılan 64 MB shm ile "could not resize
shared memory segment" verir.

- [ ] **Step 3: Manifest kapısı** — Run:

```
rtk kubectl apply --dry-run=client -f deploy/k8s/geo-config.yaml -f deploy/k8s/nominatim.yaml
```

Expected: `configmap/bumpinto-geo`, `persistentvolumeclaim/nominatim-data`,
`deployment.apps/nominatim`, `service/nominatim` — dördü de `created (dry run)`.

- [ ] **Step 4: Kümede doğrulama — KULLANICI ÇALIŞTIRIR** (ilk ithal 1–3 saat)

```
# KULLANICI CALISTIRIR
rtk kubectl apply -f deploy/k8s/geo-config.yaml -f deploy/k8s/nominatim.yaml
rtk kubectl -n bumpinto logs -f deploy/nominatim | tail -5      # "Import finished" beklenir
rtk kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/search?q=Eindhoven&format=json&limit=1'
```

Expected: `[{"place_id":...,"lat":"51.44...","lon":"5.47...","display_name":"Eindhoven, ..."}]`.
Ters geocode kontrolü:

```
rtk kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/reverse?lat=51.44&lon=5.47&format=json'
```

**Bu adım spec §16.4'ün ithal süresi/disk yarısını kapatır**: log'daki toplam süre ve
`rtk kubectl -n bumpinto exec deploy/nominatim -- du -sh /var/lib/postgresql/16/main` çıktısı
`deploy/k8s/README.md`'ye gerçek değerlerle yazılır (T8 Step 3).

- [ ] **Step 5: Yerel karşılığı doğrula** (T1'in `geo` profili) — Run:

```
rtk docker compose --profile geo up -d nominatim
rtk docker compose logs --tail 5 nominatim
```

Not: yerelde de ithal saatler sürer; ajan log'un başladığını doğrular, bitişi beklemez.
`curl -s 'http://localhost:8070/status'` → ithal bitmeden `503`, bitince `OK`.

- [ ] **Step 6: Değişen dosyalar**
- `deploy/k8s/geo-config.yaml`
- `deploy/k8s/nominatim.yaml`

---

### Task 7: OSRM — hazırlık Job'ı, üç servis, aylık yenileme

**Files:**
- Create: `deploy/osrm/prepare.sh`
- Create: `deploy/k8s/osrm.yaml`
- Create: `deploy/k8s/osrm-refresh.yaml`

**Tasarım kararı:** hazırlık script'i **tek dosyadır** (`deploy/osrm/prepare.sh`) ve üç yerden
tüketilir: compose `osrm-prepare` servisi (bind mount, T1), K8s `osrm-prepare` Job'ı ve aylık
`osrm-refresh` CronJob'ı (ikisi de aynı ConfigMap). ConfigMap manifest'e gömülmez, dosyadan
üretilir — kopya yazmamanın bedeli `deploy/k8s/README.md`'de bir ek komut satırıdır.

- [ ] **Step 1: `deploy/osrm/prepare.sh`**

```bash
#!/usr/bin/env bash
# NL pbf -> osrm-extract/partition/customize, profil basina /data/<profil>/
# Atomik: gecici dizine uretilir, bitince yerine tasinir (calisan servis yarim veri gormez).
set -euo pipefail

DATA="${DATA_DIR:-/data}"
PBF_URL="${PBF_URL:-https://download.geofabrik.de/europe/netherlands-latest.osm.pbf}"
PBF="$DATA/netherlands-latest.osm.pbf"
PROFILES="${PROFILES:-car bicycle foot}"

mkdir -p "$DATA"
if [ ! -s "$PBF" ]; then
  echo "osrm: pbf indiriliyor ($PBF_URL)"
  curl -sSfL -o "$PBF" "$PBF_URL"
fi

for p in $PROFILES; do
  echo "osrm: $p hazirlaniyor"
  rm -rf "$DATA/$p.tmp"
  mkdir -p "$DATA/$p.tmp"
  cp "$PBF" "$DATA/$p.tmp/netherlands-latest.osm.pbf"
  osrm-extract   -p "/opt/$p.lua" "$DATA/$p.tmp/netherlands-latest.osm.pbf"
  osrm-partition "$DATA/$p.tmp/netherlands-latest.osrm"
  osrm-customize "$DATA/$p.tmp/netherlands-latest.osrm"
  rm -f "$DATA/$p.tmp/netherlands-latest.osm.pbf"
  rm -rf "$DATA/$p.old"
  if [ -d "$DATA/$p" ]; then mv "$DATA/$p" "$DATA/$p.old"; fi
  mv "$DATA/$p.tmp" "$DATA/$p"
  rm -rf "$DATA/$p.old"
done

rm -f "$PBF"          # ~1,6 GB; bir sonraki kosu yeniden indirir
echo "osrm: hazir"
du -sh "$DATA"
```

Not: `PBF_URL` indirmesi `curl` ile yapılır; `osrm/osrm-backend` imajında `curl` yoksa Job/CronJob
indirmeyi bir initContainer'a alır (Step 2/4). Script her iki durumda da çalışır — dosya varsa
indirmeyi atlar.

- [ ] **Step 2: `deploy/k8s/osrm.yaml`** — PVC + hazırlık Job'ı + 3 Deployment/Service

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: osrm-data
  namespace: bumpinto
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: osrm-prepare
  namespace: bumpinto
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      initContainers:
        - name: fetch-pbf
          image: curlimages/curl:8.11.1
          command: ["sh", "-c"]
          args:
            - test -s /data/netherlands-latest.osm.pbf ||
              curl -sSfL -o /data/netherlands-latest.osm.pbf "$PBF_URL"
          env:
            - name: PBF_URL
              value: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
          volumeMounts:
            - { name: data, mountPath: /data }
      containers:
        - name: prepare
          image: osrm/osrm-backend:v5.27.1
          command: ["/bin/bash", "/scripts/prepare.sh"]
          volumeMounts:
            - { name: data, mountPath: /data }
            - { name: scripts, mountPath: /scripts }
          resources:
            requests: { cpu: "2", memory: 4Gi }
            limits: { memory: 12Gi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: osrm-data }
        - name: scripts
          configMap:
            name: osrm-prepare
            defaultMode: 0755
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: osrm-car
  namespace: bumpinto
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector:
    matchLabels: { app: osrm-car }
  template:
    metadata:
      labels: { app: osrm-car }
    spec:
      containers:
        - name: osrm
          image: osrm/osrm-backend:v5.27.1
          args: ["osrm-routed", "--algorithm", "mld", "/data/car/netherlands-latest.osrm"]
          ports: [{ containerPort: 5000 }]
          volumeMounts:
            - { name: data, mountPath: /data, readOnly: true }
          readinessProbe:
            httpGet: { path: "/route/v1/car/5.47,51.44;5.48,51.45", port: 5000 }
            initialDelaySeconds: 10
            periodSeconds: 15
          resources:
            requests: { cpu: 100m, memory: 1Gi }
            limits: { memory: 3Gi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: osrm-data, readOnly: true }
---
apiVersion: v1
kind: Service
metadata:
  name: osrm-car
  namespace: bumpinto
spec:
  selector: { app: osrm-car }
  ports: [{ port: 5000, targetPort: 5000 }]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: osrm-bicycle
  namespace: bumpinto
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector:
    matchLabels: { app: osrm-bicycle }
  template:
    metadata:
      labels: { app: osrm-bicycle }
    spec:
      containers:
        - name: osrm
          image: osrm/osrm-backend:v5.27.1
          args: ["osrm-routed", "--algorithm", "mld", "/data/bicycle/netherlands-latest.osrm"]
          ports: [{ containerPort: 5000 }]
          volumeMounts:
            - { name: data, mountPath: /data, readOnly: true }
          readinessProbe:
            httpGet: { path: "/route/v1/bicycle/5.47,51.44;5.48,51.45", port: 5000 }
            initialDelaySeconds: 10
            periodSeconds: 15
          resources:
            requests: { cpu: 100m, memory: 1Gi }
            limits: { memory: 3Gi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: osrm-data, readOnly: true }
---
apiVersion: v1
kind: Service
metadata:
  name: osrm-bicycle
  namespace: bumpinto
spec:
  selector: { app: osrm-bicycle }
  ports: [{ port: 5000, targetPort: 5000 }]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: osrm-foot
  namespace: bumpinto
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector:
    matchLabels: { app: osrm-foot }
  template:
    metadata:
      labels: { app: osrm-foot }
    spec:
      containers:
        - name: osrm
          image: osrm/osrm-backend:v5.27.1
          args: ["osrm-routed", "--algorithm", "mld", "/data/foot/netherlands-latest.osrm"]
          ports: [{ containerPort: 5000 }]
          volumeMounts:
            - { name: data, mountPath: /data, readOnly: true }
          readinessProbe:
            httpGet: { path: "/route/v1/foot/5.47,51.44;5.48,51.45", port: 5000 }
            initialDelaySeconds: 10
            periodSeconds: 15
          resources:
            requests: { cpu: 100m, memory: 1Gi }
            limits: { memory: 3Gi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: osrm-data, readOnly: true }
---
apiVersion: v1
kind: Service
metadata:
  name: osrm-foot
  namespace: bumpinto
spec:
  selector: { app: osrm-foot }
  ports: [{ port: 5000, targetPort: 5000 }]
```

**RWO PVC uyarısı:** hazırlık Job'ı yazar, üç Deployment salt-okur bağlar. Tek düğümlü bare-metal
kümede (kullanıcının kurulumu) dört pod aynı düğüme düşer ve RWO çalışır; çok düğümlü bir kümeye
geçilirse PVC `ReadWriteMany` (NFS/Longhorn) olmalıdır — `deploy/k8s/README.md`'ye not düşülür.

- [ ] **Step 3: `deploy/k8s/osrm-refresh.yaml`** — aylık yenileme

CronJob önce veriyi yeniden üretir (initContainer: pbf; ana initContainer: prepare), sonra üç
Deployment'ı `rollout restart` ile taze dosyalara döndürür. Restart için dar kapsamlı RBAC.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: osrm-refresher
  namespace: bumpinto
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: osrm-refresher
  namespace: bumpinto
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["osrm-car", "osrm-bicycle", "osrm-foot"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: osrm-refresher
  namespace: bumpinto
subjects:
  - kind: ServiceAccount
    name: osrm-refresher
    namespace: bumpinto
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: osrm-refresher
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: osrm-refresh
  namespace: bumpinto
spec:
  # Ayin 2'si 04:00 — venues-open-import'tan (1'i 03:00) bir gun sonra, cakismasin
  schedule: "0 4 2 * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 10800
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: osrm-refresher
          initContainers:
            - name: fetch-pbf
              image: curlimages/curl:8.11.1
              command: ["sh", "-c"]
              args:
                - curl -sSfL -o /data/netherlands-latest.osm.pbf "$PBF_URL"
              env:
                - name: PBF_URL
                  value: https://download.geofabrik.de/europe/netherlands-latest.osm.pbf
              volumeMounts:
                - { name: data, mountPath: /data }
            - name: prepare
              image: osrm/osrm-backend:v5.27.1
              command: ["/bin/bash", "/scripts/prepare.sh"]
              volumeMounts:
                - { name: data, mountPath: /data }
                - { name: scripts, mountPath: /scripts }
              resources:
                requests: { cpu: "2", memory: 4Gi }
                limits: { memory: 12Gi }
          containers:
            - name: restart
              image: bitnami/kubectl:1.31
              command: ["kubectl"]
              args:
                - -n
                - bumpinto
                - rollout
                - restart
                - deployment/osrm-car
                - deployment/osrm-bicycle
                - deployment/osrm-foot
          volumes:
            - name: data
              persistentVolumeClaim: { claimName: osrm-data }
            - name: scripts
              configMap:
                name: osrm-prepare
                defaultMode: 0755
```

Hazırlık `initContainers`'tadır: sıra garantilidir (pbf → prepare → restart) ve prepare hata
verirse restart hiç koşmaz — eski veri ayakta kalır.

**RWO çakışması:** yenileme sırasında PVC hem CronJob pod'una (RW) hem üç Deployment'a (RO) bağlıdır.
Tek düğümde sorun yok; çok düğümlü kümede `ReadWriteMany` şartı burada da geçerlidir.

- [ ] **Step 4: Manifest kapısı** — Run:

```
rtk kubectl apply --dry-run=client -f deploy/k8s/osrm.yaml -f deploy/k8s/osrm-refresh.yaml
```

Expected: `persistentvolumeclaim/osrm-data`, `job.batch/osrm-prepare`, üç `deployment.apps/osrm-*`,
üç `service/osrm-*`, `serviceaccount/osrm-refresher`, `role.rbac.../osrm-refresher`,
`rolebinding.rbac.../osrm-refresher`, `cronjob.batch/osrm-refresh` — hepsi `created (dry run)`.
ConfigMap `osrm-prepare` bu dosyalarda yok (dosyadan üretilir) — dry-run bunu şikâyet etmez,
gerçek `apply` öncesi Step 5'in ilk komutu şarttır.

- [ ] **Step 5: Kümede doğrulama — KULLANICI ÇALIŞTIRIR** (hazırlık 20–40 dk)

```
# KULLANICI CALISTIRIR
rtk kubectl -n bumpinto create configmap osrm-prepare \
  --from-file=prepare.sh=deploy/osrm/prepare.sh --dry-run=client -o yaml | rtk kubectl apply -f -
rtk kubectl apply -f deploy/k8s/osrm.yaml -f deploy/k8s/osrm-refresh.yaml
rtk kubectl -n bumpinto logs -f job/osrm-prepare        # "osrm: hazir" + du -sh
rtk kubectl -n bumpinto rollout status deploy/osrm-car deploy/osrm-bicycle deploy/osrm-foot
```

Sonra matris ucunu doğrula (`RoutingPort.durations` bunu çağırır, spec §9):

```
rtk kubectl -n bumpinto run osrm-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://osrm-car:5000/table/v1/car/5.47,51.44;5.48,51.45'
```

Expected: `{"code":"Ok","durations":[[0,NNN],[NNN,0]],"sources":[...],"destinations":[...]}`.
Aynı komut `osrm-bicycle:5000/table/v1/bicycle/...` ve `osrm-foot:5000/table/v1/foot/...` için
tekrarlanır; üçünde de `"code":"Ok"` ve **birbirinden farklı** süreler beklenir (aynı sayı gelirse
yanlış profil dosyası bağlanmıştır).

- [ ] **Step 6: Yerel karşılığını doğrula** — Run:

```
rtk docker compose --profile geo-prepare run --rm osrm-prepare
rtk docker compose --profile geo up -d osrm-car osrm-bicycle osrm-foot
curl -s 'http://localhost:5001/table/v1/car/5.47,51.44;5.48,51.45'
```

Expected: `"code":"Ok"`. (Hazırlık ~20–40 dk sürer; ajan uzun koşuyu başlatır ve çıktısını bekler.)

- [ ] **Step 7: Değişen dosyalar**
- `deploy/osrm/prepare.sh`
- `deploy/k8s/osrm.yaml`
- `deploy/k8s/osrm-refresh.yaml`

---

### Task 8: PMTiles yedeği (isteğe bağlı) + runbook + belge + INDEX

**Files:**
- Create: `deploy/tiles/nginx.conf`
- Create: `deploy/tiles/style.json`
- Create: `deploy/k8s/tiles.yaml`
- Create: `deploy/k8s/README.md`
- Modify: `docs/CONFIGURATION.md` (§1 tablo satırları, §7 sonu)
- Modify: `docs/superpowers/plans/INDEX.md` (I-2 satırı + iz kilidi)
- Modify: `docs/superpowers/plans/2026-09-01-plan5-ci-deploy.md` (backend Deployment'a ConfigMap kancası)

**Neden isteğe bağlı:** OpenFreeMap'in SLA'sı yok (spec §16.6). Manifest'ler **yazılır ama
uygulanmaz**; ilk kesintide `MAP_TILES_STYLE_URL` tek satır değiştirilerek geçilir. İstemci kodu
(W-12) değişmez.

- [ ] **Step 1: `deploy/tiles/nginx.conf`**

```nginx
# PMTiles tek dosya + HTTP Range. MapLibre pmtiles protokolu byte-range ister.
server {
    listen 80;
    root /srv/tiles;

    location = /healthz { return 200 "ok"; }

    location ~ \.pmtiles$ {
        add_header Accept-Ranges bytes always;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Headers "Range" always;
        add_header Access-Control-Expose-Headers "Content-Length,Content-Range,ETag" always;
        add_header Cache-Control "public, max-age=86400" always;
        if ($request_method = OPTIONS) { return 204; }
    }

    location = /style.json {
        default_type application/json;
        alias /srv/style/style.json;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Cache-Control "public, max-age=300" always;
    }
}
```

nginx statik dosyalarda Range'i zaten destekler; `Accept-Ranges` başlığı açıkça basılır ki
istemci tarafında teşhis kolay olsun.

- [ ] **Step 2: `deploy/tiles/style.json`** (Protomaps kaynağı, positron'a yakın sade katmanlar)

```json
{
  "version": 8,
  "name": "BumpInto Protomaps",
  "glyphs": "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  "sprite": "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
  "sources": {
    "protomaps": {
      "type": "vector",
      "url": "pmtiles://https://tiles.bumpinto.app/netherlands.pmtiles",
      "attribution": "© <a href=\"https://openstreetmap.org/copyright\">OpenStreetMap</a> · Protomaps"
    }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#f6f4f0" } },
    { "id": "earth", "type": "fill", "source": "protomaps", "source-layer": "earth",
      "paint": { "fill-color": "#f6f4f0" } },
    { "id": "landuse", "type": "fill", "source": "protomaps", "source-layer": "landuse",
      "paint": { "fill-color": "#e9eee3" } },
    { "id": "water", "type": "fill", "source": "protomaps", "source-layer": "water",
      "paint": { "fill-color": "#c6d8e2" } },
    { "id": "roads", "type": "line", "source": "protomaps", "source-layer": "roads",
      "paint": { "line-color": "#e3ded6", "line-width": 1.2 } },
    { "id": "buildings", "type": "fill", "source": "protomaps", "source-layer": "buildings",
      "paint": { "fill-color": "#ece8e1" } },
    { "id": "places", "type": "symbol", "source": "protomaps", "source-layer": "places",
      "layout": { "text-field": ["get", "name"], "text-size": 12,
                  "text-font": ["Noto Sans Regular"] },
      "paint": { "text-color": "#5b5750", "text-halo-color": "#ffffff", "text-halo-width": 1 } }
  ]
}
```

**W-12 bağımlılığı:** `pmtiles://` şeması MapLibre'de yerleşik değildir; web tarafı `pmtiles`
paketini yükleyip `maplibregl.addProtocol("pmtiles", protocol.tile)` çağırmak zorundadır.
Bu satır plan 31'in (W-12) işidir; burada yalnız not edilir.

- [ ] **Step 3: `deploy/k8s/tiles.yaml`**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tiles-data
  namespace: bumpinto
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tiles
  namespace: bumpinto
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector:
    matchLabels: { app: tiles }
  template:
    metadata:
      labels: { app: tiles }
    spec:
      containers:
        - name: nginx
          image: nginx:1.27-alpine
          ports: [{ containerPort: 80 }]
          volumeMounts:
            - { name: data, mountPath: /srv/tiles }
            - { name: style, mountPath: /srv/style }
            - { name: conf, mountPath: /etc/nginx/conf.d }
          readinessProbe:
            httpGet: { path: /healthz, port: 80 }
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 256Mi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: tiles-data }
        - name: style
          configMap: { name: tiles-style }
        - name: conf
          configMap: { name: tiles-nginx }
---
apiVersion: v1
kind: Service
metadata:
  name: tiles
  namespace: bumpinto
spec:
  selector: { app: tiles }
  ports: [{ port: 80, targetPort: 80 }]
```

İki ConfigMap (`tiles-nginx`, `tiles-style`) `deploy/tiles/` dosyalarından üretilir — OSRM
script'iyle aynı desen, kopya yok.

- [ ] **Step 4: Manifest kapısı** — Run:

```
rtk kubectl apply --dry-run=client -f deploy/k8s/tiles.yaml
```

Expected: `persistentvolumeclaim/tiles-data`, `deployment.apps/tiles`, `service/tiles` —
üçü de `created (dry run)`. Ayrıca stil JSON'unun geçerliliği:

```
rtk python3 -c "import json;json.load(open('deploy/tiles/style.json'));print('style ok')"
```

- [ ] **Step 5: `deploy/k8s/README.md`** (Plan 5'in README'si bu planla birlikte doğar)

```markdown
# Deploy — BumpInto

Namespace `bumpinto`. Secret'ı SEN oluşturursun (değerler asla repoya girmez) — komut ve
anahtar listesi için Plan 5 Task 3 / `docs/CONFIGURATION.md` §5.

    kubectl apply -f deploy/k8s/

> Uygulama dosyasında olmayan iki ConfigMap dosyadan üretilir; `apply`'dan ÖNCE koş:
>
>     kubectl -n bumpinto create configmap osrm-prepare \
>       --from-file=prepare.sh=deploy/osrm/prepare.sh --dry-run=client -o yaml | kubectl apply -f -
>     kubectl -n bumpinto create configmap tiles-nginx \
>       --from-file=default.conf=deploy/tiles/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
>     kubectl -n bumpinto create configmap tiles-style \
>       --from-file=style.json=deploy/tiles/style.json --dry-run=client -o yaml | kubectl apply -f -

---

## Açık veri servisleri (I-2)

Hepsi opsiyoneldir: `bumpinto-geo` ConfigMap'indeki ilgili anahtar boşsa backend public
Nominatim'e ve haversine tahminine düşer, `venues_open` boşsa `open` sağlayıcısı sonuç
döndürmez ve orkestratör Foursquare'de kalır. Yani sıra bozulursa ürün çöker değil, körelir.

### Uygulama sırası

| # | Adım | Süre | Komut |
|---|---|---|---|
| 1 | PostGIS uzantısı (bir kez, süper kullanıcı) | 1 dk | `psql "<superuser dsn>" -c 'create extension if not exists postgis'` |
| 2 | Backend V11 migration'ı (`venues_open`) | otomatik | backend açılışta Flyway |
| 3 | `geo-config.yaml` | anında | `kubectl apply -f deploy/k8s/geo-config.yaml` |
| 4 | `nominatim.yaml` | **1–3 saat** ithal | `kubectl apply -f deploy/k8s/nominatim.yaml` |
| 5 | `osrm-prepare` ConfigMap + `osrm.yaml` | **20–40 dk** hazırlık | yukarıdaki configmap komutu + `kubectl apply -f deploy/k8s/osrm.yaml` |
| 6 | `osrm-refresh.yaml` | anında | `kubectl apply -f deploy/k8s/osrm-refresh.yaml` |
| 7 | `venues-open-import.yaml` + ilk manuel koşu | **~30–60 dk** | `kubectl -n bumpinto create job --from=cronjob/venues-open-import venues-open-manual-1` |
| 8 | (isteğe bağlı) `tiles.yaml` + PMTiles yükleme | ~15 dk | aşağıdaki "Tile yedeği" |

4 ve 5 paralel koşabilir; 7 yalnız 1–2'yi bekler.

### Disk

| PVC | Boyut | İçerik |
|---|---|---|
| `nominatim-data` | 20Gi | Nominatim'in kendi Postgres'i (NL ≈ 15 GB) |
| `osrm-data` | 10Gi | car + bicycle + foot MLD dosyaları (≈ 6 GB) |
| `venues-open-work` | 20Gi | pbf + osm2pgsql slim tabloları (koşu sonunda düşer) |
| `tiles-data` | 5Gi | `netherlands.pmtiles` (≈ 2 GB) |

Uygulama Postgres'inde `venues_open` ≈ 2 GB. **Toplam ≈ 30 GB** (spec §17).

### Doğrulama

```bash
# Nominatim: ileri + ters
kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/search?q=Eindhoven&format=json&limit=1'
kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/reverse?lat=51.44&lon=5.47&format=json'

# OSRM: matris ucu (RoutingPort'un cagirdigi ucun aynisi)
kubectl -n bumpinto run osrm-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://osrm-car:5000/table/v1/car/5.47,51.44;5.48,51.45'
# osrm-bicycle / osrm-foot icin profil adini degistir; sureler BIRBIRINDEN FARKLI olmali

# venues_open: tur basina satir
psql "<dsn>" -c "select count(*), unnest(activity_types) from venues_open group by 2 order by 2"

# PostGIS
psql "<dsn>" -c "select postgis_full_version()"
```

`venues-open-import` log'u her koşuda tür başına Overture sayımını ve tür başına foto kapsama
yüzdesini basar — `MUSEUM|THEME_PARK|ART` üçlüsünde %40 altı, spec §5.3'teki TripAdvisor (1b)
kararının tetiğidir.

### Tile yedeği (OpenFreeMap kesintisinde)

OpenFreeMap'in SLA'sı yok (spec §16.6). Kendi PMTiles'ına geçiş:

```bash
# 1) NL kutusunu cikar (yerel makinede, ~2 GB)
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles netherlands.pmtiles \
  --bbox=3.2,50.7,7.3,53.6

# 2) PVC'ye kopyala (yardimci pod uzerinden)
kubectl -n bumpinto apply -f deploy/k8s/tiles.yaml
kubectl -n bumpinto cp netherlands.pmtiles "$(kubectl -n bumpinto get pod -l app=tiles \
  -o jsonpath='{.items[0].metadata.name}')":/srv/tiles/netherlands.pmtiles

# 3) Ingress'te tiles.bumpinto.app -> service/tiles ekle (I-1 ingress.yaml)
# 4) Motoru cevir: TEK satir
kubectl -n bumpinto patch configmap bumpinto-geo --type merge \
  -p '{"data":{"MAP_TILES_STYLE_URL":"https://tiles.bumpinto.app/style.json"}}'
kubectl -n bumpinto rollout restart deployment/backend
```

İstemci kodu değişmez: motor `GET /api/config`'ten gelir (spec §7). Web tarafının `pmtiles://`
protokolünü kaydetmesi W-12'nin işidir.

### Bilinen sınırlar

- **RWO PVC:** `osrm-data`'yı hazırlık Job'ı yazar, üç Deployment salt-okur bağlar. Tek düğümlü
  kümede sorunsuz; çok düğüme geçilirse `ReadWriteMany` (NFS/Longhorn) şart.
- **Nominatim tek replica, `Recreate`:** ithal sırasında servis yok; ilk kurulumda 1–3 saat.
- **`venues-open-import` swap'i** `venues_open` yoksa bilerek patlar — önce V11.
```

- [ ] **Step 6: `docs/CONFIGURATION.md` §1 tablosuna satırlar ekle**

```markdown
| `GEOCODE_BASE_URL` | Kendi kümendeki Nominatim'in adresi (`http://nominatim:8080`). **Boşsa** public Nominatim kullanılır (1 istek/sn throttle) | I-2 `deploy/k8s/nominatim.yaml` | Hayır |
| `GEOCODE_ENGINE` | `nominatim` (varsayılan) \| `photon`. Photon servisi kurulmadı — spec §8'de isteğe bağlı ikinci adım | — | Hayır |
| `OSRM_CAR_URL` / `OSRM_BICYCLE_URL` / `OSRM_FOOT_URL` | Profil başına OSRM `table` ucu (`http://osrm-car:5000` …). **Boşsa** süreler haversine tahmini olur (`travel[].estimated=true`) | I-2 `deploy/k8s/osrm.yaml` | Hayır |
| `MAP_ENGINE` | `maplibre` (varsayılan) \| `google`. `google` seçilirse Places sağlayıcısı da açık olmalı (ToS, spec §0.2) | — | Hayır |
| `MAP_TILES_STYLE_URL` | MapLibre stil JSON'u. Varsayılan `https://tiles.openfreemap.org/styles/positron`; kendi PMTiles'ına geçiş bu tek satırdır | — | Hayır |
| `RETENTION_ENABLED` | Saklama indirgemesinin (spec §11) açık olup olmadığı. Prod'da `true` | — | Hayır |
| `FSQ_PREMIUM_MONTHLY_BUDGET` | Foursquare Premium için sert aylık çağrı tavanı (varsayılan `5000`). Dolunca kaynak elenir, ürün `open`'a düşer — güvenlik tavanı, iş tavanı değil | FSQ konsolundaki harcama tercihine göre | Hayır |
| `OVERTURE_RELEASE` | İthal işinin okuduğu Overture sürümü (örn. `2026-08-20.0`). Yalnız `venues-open-import` CronJob'ında | https://docs.overturemaps.org/release/ | Hayır |
| `PBF_URL` | Geofabrik NL extract adresi; OSM ithali ve OSRM hazırlığı bunu kullanır | — | Hayır |

`NOMINATIM_CONTACT` artık iki yerde kullanılıyor: Nominatim User-Agent'ı **ve** Wikidata/Commons
toplu sorguları (`tools/venues-open/wikidata_photos.py`). Boş bırakılırsa ithal işi açılışta
patlar — Wikimedia politikası gerçek bir iletişim adresi ister.
```

- [ ] **Step 7: `docs/CONFIGURATION.md` §7'nin sonuna kısa not**

```markdown
### 7.1 Açık taban (I-2 sonrası)

`venues_open` tablosu aylık `venues-open-import` CronJob'ıyla Overture Places NL + OSM NL'den
yeniden üretilir; sorgusu ücretsizdir ve kotası yoktur (`sources.open.budget = 0`). Ücretli
sağlayıcı yalnız Foursquare Premium'dur (`FSQ_PREMIUM_MONTHLY_BUDGET`). Sabit maliyet: küme
diskinde ~30 GB (bkz. `deploy/k8s/README.md`). Ayrıntılı maliyet:
`docs/superpowers/specs/2026-09-06-open-hybrid-venue-stack-design.md` §17.
```

- [ ] **Step 8: Plan 5'e ConfigMap kancası ekle**

`2026-09-01-plan5-ci-deploy.md` Task 3 Step 2'deki backend Deployment'ın `envFrom` bloğu iki
kaynak taşımalı; aksi halde B-13'ün okuduğu geocode/rota/harita anahtarları pod'a hiç ulaşmaz.
Plan 6'nın Plan 5'e kapı satırı eklemesiyle aynı desen.

```yaml
          envFrom:
            - secretRef: { name: bumpinto-backend }
            - configMapRef: { name: bumpinto-geo }   # I-2: geocode/OSRM/harita anahtarlari
```

Ayrıca Task 4 yayın kontrol listesine iki satır:

```markdown
  - [ ] **I-2 açık veri servisleri uygulandı** (`deploy/k8s/README.md` "Açık veri servisleri"):
    Nominatim `/search` yanıt veriyor, üç OSRM `table` ucu `"code":"Ok"` dönüyor,
    `venues_open` dolu (`select count(*) from venues_open` > 0)
  - [ ] `bumpinto-geo` ConfigMap'inde `NOMINATIM_CONTACT` gerçek bir adres (DEGISTIR@ kalmadı)
```

- [ ] **Step 9: INDEX'e I-2 satırı + iz kilidi**

"## I — Altyapı" tablosuna:

```markdown
| I-2 | Açık veri altyapısı — Overture/OSM ithal hattı, Nominatim NL, OSRM ×3, PMTiles yedeği | `2026-09-06-plan32-open-hybrid-infra.md` | Plan 32 | ready | **I-1:T1–T3** (imaj/secret adları), **B-13 V11** (`venues_open`) | — | 8 görev. Spec §16.3 (PostGIS yetkisi), §16.4 (Nominatim süre/disk), §16.6 (PMTiles yedeği), §16.7 (Overture slug'ları) bu planın doğrulama adımlarıyla kapanır. Kapsam dışı: Valhalla/GTFS, Photon, TripAdvisor, NL dışı extract |
```

"## Çapraz iz kilitleri" bölümüne:

```markdown
7. **I-2 ⇄ I-1 ⇄ B-13.** `deploy/k8s/` I-2 ile doğar; I-1:T3 backend Deployment'ı
   `configMapRef: bumpinto-geo`'yu I-2'den alır (Plan 5 Task 3 Step 2 güncellendi).
   `venues-open-import` swap'i B-13'ün V11'ini bekler — V11 yoksa iş bilerek patlar.
   Sıra: **I-1:T1–T3 → B-13 (V11 dahil) → I-2:T5–T8 → I-1:T4**.
   I-2:T1–T4 (compose + `tools/venues-open` + testler) hiçbirini beklemez.
```

- [ ] **Step 10: Değişen dosyalar**
- `deploy/tiles/nginx.conf`, `deploy/tiles/style.json`
- `deploy/k8s/tiles.yaml`, `deploy/k8s/README.md`
- `docs/CONFIGURATION.md`
- `docs/superpowers/plans/INDEX.md`
- `docs/superpowers/plans/2026-09-01-plan5-ci-deploy.md`

---

## Plan sonu doğrulaması

- [ ] `PY_TEST` tümü yeşil (Postgres'li testler `TEST_DB_URL` ile koşulmuş, `skip` sayısı 0).
- [ ] `luac -p tools/venues-open/osm_poi.lua` sessiz.
- [ ] `rtk kubectl apply --dry-run=client -f deploy/k8s/` tüm kaynakları `created (dry run)` diyor.
- [ ] `rtk docker compose config -q` sessiz; `--profile geo` beş servis listeliyor.
- [ ] `select postgis_full_version()` hem yerelde hem kümede yanıt veriyor (**spec §16.3 kapandı**).
- [ ] İlk ithal log'unda 15 türün hepsi için Overture satır sayısı var; 0 dönen slug düzeltildi
      (**spec §16.7 kapandı**).
- [ ] Foto kapsama raporu tür başına yüzde basıyor; `MUSEUM|THEME_PARK|ART` değerleri kullanıcıya
      raporlandı (**spec §16.2'nin girdisi verildi**; 1b kararı kullanıcıda).
- [ ] Nominatim ithal süresi ve `du -sh` çıktısı `deploy/k8s/README.md`'ye gerçek değerlerle
      yazıldı (**spec §16.4 kapandı**).
- [ ] `tiles.yaml` + `style.json` yazıldı, `--dry-run` geçti, uygulanmadı; geçiş tek env satırı
      (**spec §16.6 kapandı**).
- [ ] `venues_open` swap'i indeks adlarını V11 adlarına döndürüyor
      (`\d venues_open` → `venues_open_geom_gist`, `venues_open_activity_types_gin`,
      `venues_open_pkey`) — bu, "rename tabloyu taşır ama indeksi taşımaz" tuzağının kanıtıdır.
- [ ] Hiçbir dosyada sır **değeri** yok; manifest'ler yalnız `bumpinto-backend` adını referanslıyor.
- [ ] Yıkıcı komutların hepsi "KULLANICI ÇALIŞTIRIR" etiketli ve ajan tarafından koşulmadı.
- [ ] Git yazma işlemi yapılmadı; her görev "Değişen dosyalar" ile kapandı.
