#!/usr/bin/env bash
# npm/pnpm betikleri nvm fonksiyonunu miras almaz; burada yüklenir ve .nvmrc'deki sürüme
# geçilir. Sürüm kurulu değilse önce kurulur (nvm install .nvmrc'yi okur), sonra kullanılır.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "init-nvm.sh: nvm bulunamadı ($NVM_DIR/nvm.sh); sistem node kullanılacak" >&2
  return 0 2>/dev/null || exit 0
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
if ! nvm use --silent >/dev/null 2>&1; then
  echo "init-nvm.sh: .nvmrc sürümü kurulu değil, kuruluyor..." >&2
  nvm install >/dev/null && nvm use --silent >/dev/null
fi
