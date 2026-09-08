import { router } from "expo-router";

import type { PermissionOutcome } from "./permissions";

/**
 * M-6 sesli sohbet dock'unun TEK giriş noktası.
 *
 * SÖZLEŞME: dock `getUserMedia`/WebRTC'yi çağırmadan ÖNCE `presentMicConsent()` bekler.
 * `"granted"` dışında bir sonuçta oylama akışı BOZULMADAN dock hata durumuna geçer
 * (uyumluluk §1 L5) — mikrofon reddi buluşmayı bitirmez.
 *
 * Ön-ekran yalnız sesli sohbet için gösterilir: Play "prominent disclosure" izni özelliğin
 * kullanıldığı ANDA ister, açılışta değil.
 *
 * Eşzamanlı çağrılar tek alt sayfada birleşir: iki katılımcı satırına aynı anda basmak
 * iki modal üst üste açardı.
 */
export type MicConsentResult = PermissionOutcome | "dismissed";

let pending: ((result: MicConsentResult) => void)[] = [];

export function presentMicConsent(): Promise<MicConsentResult> {
  const promise = new Promise<MicConsentResult>((resolve) => pending.push(resolve));
  if (pending.length === 1) router.push("/(sheets)/mic-consent");
  return promise;
}

/** Alt sayfa kapanırken çağrılır — kaydırarak kapatma dahil (aksi hâlde söz asla çözülmez). */
export function resolveMicConsent(result: MicConsentResult): void {
  const waiting = pending;
  pending = [];
  waiting.forEach((resolve) => resolve(result));
}
