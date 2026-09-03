export type LatLng = { lat: number; lng: number };

/** Backend GeoMath.centroid'in birebir kopyası (küresel ortalama). */
export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  let x = 0, y = 0, z = 0;
  for (const p of points) {
    const lat = (p.lat * Math.PI) / 180, lng = (p.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng); y += Math.cos(lat) * Math.sin(lng); z += Math.sin(lat);
  }
  const n = points.length; x /= n; y /= n; z /= n;
  const lng = Math.atan2(y, x), hyp = Math.sqrt(x * x + y * y), lat = Math.atan2(z, hyp);
  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

/** Haritada tam koordinat çizilmez — ~1 km (2 ondalık) yuvarlama (spec §4b). */
export function approx(p: LatLng): LatLng {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}

const R = 6371000;
/** İki nokta arası metre (haversine). "Herkesin ortasına ~X m" için — çağıran 50 m'ye yuvarlar. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

type MaybePoint = { lat?: number; lng?: number } | null | undefined;

/** `distanceMeters` + 50 m'ye yuvarlama, eksik koordinatlarda `null` — WinnerCard'ın meta
    satırı ve WhyHere'in YER ekseni AYNI sayıyı okur (Task 5 code-review bulgusu: iki yerde
    ayrı hesap ayrışabiliyordu). */
export function roundedMidpointMeters(a: MaybePoint, b: MaybePoint): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const meters = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  return Math.round(meters / 50) * 50;
}
