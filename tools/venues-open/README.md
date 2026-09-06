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

## Testler

```bash
docker compose up -d postgres        # repo kokunden
export TEST_DB_URL=jdbc:postgresql://localhost:5432/bumpinto
.venv/bin/python -m pytest -q
```

`TEST_DB_URL` yoksa Postgres isteyen testler `skip` olur; saf Python testleri her koşulda koşar.

## Kategori eşlemesi

`category_map.yml` 15 `ActivityType`'ı Overture slug'larına ve OSM etiket çiftlerine bağlar.
`backend/src/main/resources/venue-sources/open.yml` bunun aynasıdır — biri değişince diğeri.
İlk ithal tür başına sayım basar; 0 satır dönen bir slug yanlış yazılmıştır.
