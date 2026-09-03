/* Karar dokümanı §5.B.7 — finalist kartının ALTINDA tek satır: toplam ~N dk · fark ~N dk.
   Karar verici hücre amber-wash: iki finalist arasında ≥5 dk fark ya da ≥0.3★ varsa.
   Saf fonksiyon + eşikler burada yaşar (RunoffTrailer.tsx yalnız bileşeni içerir — Fast
   Refresh bir .tsx modülün TÜM export'larının bileşen olmasını gerektirir). */
import { fairnessOf, type VenueDto as Venue } from "@bumpinto/shared";

export const DECIDING_MINUTES = 5;
export const DECIDING_RATING = 0.3;

// Puan farkını 5.C ile aynı yuvarlamayla karşılaştırır — 4.5-4.2 gibi float ondalıkları eşik
// hemen altında kalıp "değil" görünmesin diye küçük bir epsilon toleransı var.
export const RATING_EPSILON = 1e-9;

/** Bu finalist, diğerlerine göre "kararı veren" mi? (toplam yol ya da puan üstünlüğü).
    Eksik veri sentinel (Infinity / -1) ile karışıp yanlış "kararı veren" üretmesin diye
    `others` yalnız GERÇEKTEN tanımlı değerlere süzülür; hiçbiri tanımlı değilse o kıyas
    hesaba katılmaz (false döner, uydurma "kazanır" yok). */
export function isDeciding(venue: Venue, all: Venue[]): boolean {
  const me = fairnessOf(venue);
  const others = all.filter((v) => v.id !== venue.id);
  if (others.length === 0 || me == null) return false;

  const otherTotals = others
    .map((v) => fairnessOf(v)?.total)
    .filter((n): n is number => n != null);
  const otherRatings = others.map((v) => v.rating).filter((n): n is number => n != null);

  const minutesWin =
    otherTotals.length > 0 && Math.min(...otherTotals) - me.total >= DECIDING_MINUTES;
  const ratingWin =
    venue.rating != null &&
    otherRatings.length > 0 &&
    venue.rating - Math.max(...otherRatings) >= DECIDING_RATING - RATING_EPSILON;
  return minutesWin || ratingWin;
}
