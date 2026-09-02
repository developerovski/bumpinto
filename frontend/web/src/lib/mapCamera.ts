import type { LatLng } from "./geo";

/**
 * Harita kamerası: çizilen her şey (katılımcı pinleri, orta nokta, yarıçap çemberi, mekanlar)
 * kadraja girmeli. Karar Google'a bırakılamaz — `fitBounds` sıfır alanlı bir kutuya maksimum
 * zoom'u verir ve tek katılımcılı oturumda harita "denizin ortası"na kilitlenir.
 */

/** Tek nokta / çok dar kutu: sokak seviyesi değil, şehir seviyesi ölçek. */
export const SOLO_ZOOM = 13;
/** İki nokta birbirine çok yakınken fitBounds'un verdiği zoom'un üst sınırı. */
export const MAX_FIT_ZOOM = 15;
/** Bundan dar bir kutu "tek nokta" sayılır (~1.1 km enlem farkı). */
const MIN_SPAN_DEG = 0.01;

const EARTH_KM_PER_DEG = 111.32;

export type Camera =
  | { kind: "point"; center: LatLng; zoom: number }
  | { kind: "bounds"; sw: LatLng; ne: LatLng };

/** Çemberi çevreleyen kutu — yarıçap kadrajın dışında kalırsa "orta nokta" okunmaz olur. */
function circleCorners(center: LatLng, radiusKm: number): LatLng[] {
  const dLat = radiusKm / EARTH_KM_PER_DEG;
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const dLng = radiusKm / (EARTH_KM_PER_DEG * Math.max(Math.abs(cos), 1e-6));
  return [
    { lat: center.lat - dLat, lng: center.lng - dLng },
    { lat: center.lat + dLat, lng: center.lng + dLng },
  ];
}

/**
 * Kadraja girecek noktalardan kamerayı hesaplar. `radiusKm` verilirse çember de kapsanır.
 * Hiç nokta yoksa `null` — çağıran haritanın mevcut kamerasına dokunmaz.
 */
export function cameraFor(points: LatLng[], midpoint?: LatLng | null, radiusKm?: number | null): Camera | null {
  const all = [...points];
  if (midpoint) {
    all.push(midpoint);
    if (radiusKm && radiusKm > 0) all.push(...circleCorners(midpoint, radiusKm));
  }
  if (all.length === 0) return null;

  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const sw = { lat: Math.min(...lats), lng: Math.min(...lngs) };
  const ne = { lat: Math.max(...lats), lng: Math.max(...lngs) };

  if (ne.lat - sw.lat < MIN_SPAN_DEG && ne.lng - sw.lng < MIN_SPAN_DEG) {
    return { kind: "point", center: { lat: (sw.lat + ne.lat) / 2, lng: (sw.lng + ne.lng) / 2 }, zoom: SOLO_ZOOM };
  }
  return { kind: "bounds", sw, ne };
}

/** Kamerayı yeniden kurmak GEREKİR mi: yalnız coğrafi içerik değişince (seçim/etiket değil). */
export function cameraSignature(points: LatLng[], midpoint?: LatLng | null, radiusKm?: number | null): string {
  return JSON.stringify([points.map((p) => [p.lat, p.lng]), midpoint, radiusKm]);
}
