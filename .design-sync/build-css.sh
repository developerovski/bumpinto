#!/bin/sh
# Compiles the DS stylesheet with the repo's own Tailwind v4 (same version as
# @bumpinto/web). Output is gitignored build state, not a committed artifact.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/frontend/web/.ds-css"
exec node "$ROOT/.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs" \
  -i "$ROOT/.design-sync/ds-styles.css" \
  -o "$ROOT/frontend/web/.ds-css/ds-styles.css" \
  --cwd "$ROOT/frontend/web" "$@"
