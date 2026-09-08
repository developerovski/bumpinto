/* Puan biçimi tek yerde yaşar — web VenueMeta/VenueCard/LikedList ve mobil mekan kartları
   bunu okur. Ölçek DÖNÜŞTÜRÜLMEZ (spec §11): 10'luk puan 10'luk yazılır, yanına sağlayıcı
   işareti gelir.

   Dil PARAMETRE: shared bir i18next örneğine bağlanamaz (web ve mobil ayrı örnek kurar);
   çağıran istemci kendi `resolvedLanguage`ini geçer. */

export function formatRating(
  locale: string | undefined,
  rating: number,
  scale?: number | null,
): string {
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
  return scale ? `${value} / ${scale}` : value;
}

/** Puanın yanındaki sağlayıcı işareti. Kimlik `/api/config.sources[].id` ile aynı sözcük; marka adı
    çevrilmez. `open` (kendi tabanımız) işaret basmaz. */
export function providerMark(provider?: string | null): string | null {
  const id = (provider ?? "").trim().toLowerCase();
  if (!id || id === "open") return null;
  return id[0].toUpperCase() + id.slice(1);
}
