/* Puan biçimi tek atomda yaşar (§4.9 "rating format unified") — VenueMeta VE VenueCard VE
   LikedList bunu okur. Kullanıcının diline göre biçimlenir (tr/nl ondalık virgül, en nokta).
   VenueMeta.tsx yalnız bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının
   bileşen olmasını gerektirir). */
import i18n from "../i18n";

export function formatRating(rating: number): string {
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}
