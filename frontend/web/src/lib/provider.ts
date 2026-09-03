/* Karar dokümanı §2 (politika) + §5.B.9 — sağlayıcı birleşimi. Attribution.tsx yalnız
   bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının bileşen olmasını
   gerektirir). */

/** Sağlayıcı birleşimi (§4.9, §5.B.9) — TÜM mekanların TEK bilinen sağlayıcısı varsa onu döner;
    herhangi bir mekanın sağlayıcısı EKSİKSE ya da karışıksa `undefined` (politika: ikisi de basılır,
    "bilinmiyor" tek sağlayıcı sayılmaz — reviewer bulgusu). */
export function unionProvider(venues: { provider?: string }[]): string | undefined {
  if (venues.length === 0) return undefined;
  const providers = new Set(venues.map((v) => v.provider).filter((p): p is string => !!p));
  return providers.size === 1 && venues.every((v) => !!v.provider) ? [...providers][0] : undefined;
}
