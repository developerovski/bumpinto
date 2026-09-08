import { useRef } from "react";

/**
 * ÇİFT DOKUNUŞ KORUMASI — aynı denetimin arka arkaya gelen ikinci dokunuşunu yutar.
 *
 * NEDEN: `onPress` her dokunuşta ateşlenir, gezinme ise ASENKRONDUR. Kullanıcı hızlıca iki kez
 * dokunduğunda ilk `router.push` daha yığına işlenmeden ikincisi geçer ve AYNI ekran iki kez
 * açılır — geri tuşuna iki kez basmak gerekir (2026-09-08 kullanıcı bildirdi). Aynı sorun
 * yazma uçlarında daha pahalıdır: iki `createSession`, iki `join`, iki `shuffle`.
 *
 * Kilit ÖRNEK BAŞINADIR, genel değil: farklı düğmelere hızlı basmak engellenmez ve
 * PROGRAMATİK gezinmeler (bir `await`ten sonra çağrılanlar) hiç etkilenmez — genel bir kilit
 * bunları sessizce yutardı ki bu, çift gezinmeden daha kötü bir hata olurdu.
 *
 * Seçim/geçiş atomlarına (`Chip`, `Segmented`) UYGULANMAZ: orada arka arkaya hızlı dokunuş
 * meşrudur (üç etkinliği peş peşe seçmek gibi).
 */
export const PRESS_LOCK_MS = 600;

/** Kararın SAF hâli — zamanı taklit etmeden sınanabilsin diye ayrı durur. */
export function shouldAcceptPress(lastAt: number, now: number): boolean {
  return now - lastAt >= PRESS_LOCK_MS;
}

export function useOncePress(onPress?: () => void): (() => void) | undefined {
  // Ref çizim sırasında OKUNMAZ, yalnız olay işleyicisinin içinde — React Compiler kuralı.
  const lastAt = useRef(0);
  if (!onPress) return undefined;

  return () => {
    const now = Date.now();
    if (!shouldAcceptPress(lastAt.current, now)) return;
    lastAt.current = now;
    onPress();
  };
}
