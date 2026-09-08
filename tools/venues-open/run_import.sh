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
