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
      .then(() => {
        track("maps_js_load"); // tekil `loading` promise'ı zaten bir kez koşuyor — çift sayım yok
      })
      .catch((e: unknown) => {
        loading = null; // sonraki MapView yeniden dener
        throw e;
      });
  }
  return loading;
}
