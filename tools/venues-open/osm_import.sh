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
