/* Spec §11 — atıf kümeyle çalışır: karışık listede HER kaynağın satırı basılır. */
/** Ekrandaki mekanların ayrık sağlayıcı kimlikleri, kararlı sırada. */
export function providerIds(venues: { provider?: string }[]): string[] {
  const ids = new Set<string>();
  for (const v of venues) if (v.provider) ids.add(v.provider);
  return [...ids].sort();
}
