#!/usr/bin/env bash
# Web dev sunucusunu HTTPS bir alan adiyla disari acar (telefonda test icin).
#
#   ./ngrok.sh                       # hesabin sabit adresi (asagidaki DOMAIN)
#   ./ngrok.sh baska.ngrok-free.dev  # baska bir adres
#   PORT=5174 ./ngrok.sh             # baska bir dev sunucusu
#
# Neden tunel: Google OAuth "JavaScript origin" olarak IP kabul etmez ve localhost
# disinda https sart. Ayrica navigator.geolocation yalniz secure context'te calisir.
# Ikisi de LAN adresiyle (http://192.168.x.x:5173) saglanamaz.
#
# Ctrl+C tuneli kapatir.
set -euo pipefail

PORT="${PORT:-5173}"
# Hesaba ATANMIS sabit adres. Free planda ad secilemez (kendi subdomain'in
# ERR_NGROK_313 ile reddedilir); ngrok bir tane atar ve o degismez. Sabit olmasi
# onemli: Google Console'daki JavaScript origin bir kez eklenip birakilabiliyor.
DOMAIN="${1:-${NGROK_DOMAIN:-unrenunciatory-unstrictly-dayle.ngrok-free.dev}}"
API="http://127.0.0.1:4040/api/tunnels"

command -v ngrok >/dev/null || { echo "ngrok kurulu degil: brew install ngrok" >&2; exit 1; }

# Tunel, dinlemeyen bir porta acilirsa sessizce 502 sunar — pesinen soyle.
if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "$PORT dinlenmiyor. Once dev sunucusunu baslat:  pnpm dev:web" >&2
  exit 1
fi

log="$(mktemp -t ngrok)"
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    # ngrok kapanmazsa tunel acik kalir; kisa bekleyip zorla.
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
    kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$log"
}
# INT/TERM'de acik cikis: aksi halde handler bittiginde ana `wait` devam ederdi.
trap 'cleanup; exit 130' INT TERM
trap cleanup EXIT

args=(http "$PORT" --log=stdout --log-level=warn)
[[ -n "$DOMAIN" ]] && args+=(--url="$DOMAIN")
ngrok "${args[@]}" >"$log" 2>&1 &
pid=$!

# Adres ngrok'un yerel API'sinden okunur; agent birkac saniyede hazir olur.
url=""
for _ in $(seq 1 20); do
  kill -0 "$pid" 2>/dev/null || { echo "ngrok kapandi:" >&2; cat "$log" >&2; exit 1; }
  url="$(curl -fsS "$API" 2>/dev/null | sed -n 's/.*"public_url":"\(https:[^"]*\)".*/\1/p' | head -1 || true)"
  [[ -n "$url" ]] && break
  sleep 0.5
done
[[ -z "$url" ]] && { echo "adres alinamadi:" >&2; cat "$log" >&2; exit 1; }

cat <<EOF

  $url   ->  localhost:$PORT

  Telefonda bu adresi ac. Google ile giris icin bir kez:
  Cloud Console > Credentials > OAuth client > Authorized JavaScript origins
  ekle:  $url

  Dikkat: adres internete aciktir; linki bilen herkes dev ortamina erisir.
  Ctrl+C ile kapat.

EOF

wait "$pid"
