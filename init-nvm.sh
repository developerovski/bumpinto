#!/usr/bin/env bash
# npm/pnpm betikleri nvm fonksiyonunu miras almaz; burada yükleyip .nvmrc'deki sürüme geçilir.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use --silent >/dev/null || nvm use
else
  echo "init-nvm.sh: nvm bulunamadı ($NVM_DIR/nvm.sh); sistem node kullanılacak" >&2
fi
