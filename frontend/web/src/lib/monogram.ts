/* Artboard: "Café Berlage" → "cb". Saf fonksiyon — VenueCard VE VenueThumb bunu okur.
   VenueCard.tsx yalnız bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının
   bileşen olmasını gerektirir). */
export function monogram(name: string | undefined): string {
  return (name ?? "")
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toLowerCase();
}
