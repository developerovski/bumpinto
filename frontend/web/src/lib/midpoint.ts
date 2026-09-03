/* Karar dokümanı §5.C "Lobi/Bekle" — orta noktaya en yakın katılımcı. MidpointCard.tsx
   yalnız bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının bileşen olmasını
   gerektirir). */
import type { ParticipantDto, SessionView } from "@bumpinto/shared";
import { distanceMeters } from "./geo";

/** Orta noktaya EN YAKIN katılımcı — "orta nokta {{isim}} tarafında" notunun kaynağı (§4.5b:
    orta nokta hıza ters ağırlıklı kaydığı için kimin tarafında olduğu anlamlı). Saf fonksiyon,
    testten de doğrudan çağrılır. */
export function nearestParticipant(view: SessionView): ParticipantDto | null {
  const mid = view.midpoint;
  if (mid?.lat == null || mid?.lng == null) return null;
  let best: ParticipantDto | null = null;
  let bestDist = Infinity;
  for (const p of view.participants ?? []) {
    const loc = p.approxLocation;
    if (loc?.lat == null || loc?.lng == null) continue;
    const d = distanceMeters({ lat: mid.lat, lng: mid.lng }, { lat: loc.lat, lng: loc.lng });
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
