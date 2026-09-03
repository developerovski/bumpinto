/* Karar dokümanı §5.C — "Yedek plan": runoff ikincisi (voteTally), yoksa likeCounts ikincisi
   (≥2 beğeni ve ≥3 katılımcı şartıyla). İkisi de yoksa satır hiç çizilmez. Sayı eşitliğinde
   `venue.id` sözlük sırasına göre kararlı bir kazanan seçilir — herkes AYNI ikincil mekanı
   görür (code-review düzeltmesi: önceden `Array.sort` kararsız kalabiliyordu).
   BackupPlan.tsx yalnız bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının
   bileşen olmasını gerektirir). */
import type { SessionView as View, VenueDto as Venue } from "@bumpinto/shared";
import { votersOf } from "./voters";

export function backupOf(view: View, winnerId: string): Venue | null {
  const venues = view.venues ?? [];
  const byId = (id: string) => venues.find((v) => v.id === id) ?? null;
  const tally = view.voteTally;
  if (tally && Object.keys(tally).length > 1) {
    const second = Object.entries(tally)
      .filter(([id]) => id !== winnerId)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))[0];
    if (second && second[1] > 0) return byId(second[0]);
  }
  const likes = view.likeCounts;
  const people = votersOf(view.participants ?? []).length;
  if (likes && people >= 3) {
    const second = Object.entries(likes)
      .filter(([id, n]) => id !== winnerId && n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))[0];
    if (second) return byId(second[0]);
  }
  return null;
}
