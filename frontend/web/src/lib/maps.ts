import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

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
