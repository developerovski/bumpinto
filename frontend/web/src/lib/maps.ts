import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { track } from "./analytics";

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

let loading: Promise<void> | null = null;

export function mapsConfigured() {
  return !!KEY && !!MAP_ID;
}

/** Tek yükleme; dil ilk çağrıda sabitlenir (setOptions yalnız bir kez çağrılabilir). */
export function loadMaps(language: string): Promise<void> {
  if (!KEY) return Promise.reject(new Error("maps key missing"));
  if (!loading) {
    setOptions({ key: KEY, v: "weekly", language });
    loading = Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(() => undefined)
      .catch((e: unknown) => {
        loading = null; // sonraki MapView yeniden dener
        throw e;
      });
  }
  return loading;
}

/** Faturalanan birim betiğin yüklenmesi DEĞİL, harita ÖRNEĞİdir (Dynamic Maps, örnek
    başına). `loadMaps` tekil promise olduğu için kullanıcı başına bir kez koşuyordu ve
    gerçek maliyeti ~3 kat eksik sayıyordu: masaüstü katılımcı yolu Katıl → Bekle →
    Mekanlar üç ayrı örnek kuruyor. Sayacı örneği yaratan her yer çağırır. */
export function trackMapInstance() {
  track("maps_map_instance");
}
