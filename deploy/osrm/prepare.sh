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
  # osrm-extract'ta --output yok, cikti girdi dosyasinin yaninda uretilir (1,6 GB'i kopyalamamak
  # icin ortak pbf'e symlink kuruyoruz; her profil boylece kendi .tmp/ dizinine yazar)
  ln -s "$PBF" "$DATA/$p.tmp/netherlands-latest.osm.pbf"
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
