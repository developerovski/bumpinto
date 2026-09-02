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
