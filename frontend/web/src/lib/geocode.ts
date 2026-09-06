/* Geocode backend'de (spec §8): istemci Nominatim'e DOĞRUDAN gitmez — politika, throttle ve
   User-Agent sunucuda. İmzalar değişmedi; çağıran yerler aynı kalır. */
import { api } from "./api";

export type Coords = { lat: number; lng: number; label: string | null };

/** Adres → koordinat. Bulunamama (404), 429 ve ağ hatası AYNI: null — çağıran "bulunamadı" der. */
export async function geocode(query: string): Promise<Coords | null> {
  try {
    const r = await api.geocode({ query });
    return { lat: r.lat, lng: r.lng, label: r.label ?? null };
  } catch {
    return null;
  }
}

/** Koordinat → semt etiketi. Etiket yoksa null; nokta yine seçilebilir. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    return (await api.reverseGeocode({ lat, lng })).label ?? null;
  } catch {
    return null;
  }
}
