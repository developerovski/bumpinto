import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import { effectiveConfig, useConfigStore } from "../store/configStore";
import type { LatLng } from "./geo";

export function loadStyleUrl(): string {
  return effectiveConfig(useConfigStore.getState()).tiles.styleUrl;
}

/** Harita örneği. Atıf denetimi AÇIK (OpenFreeMap/OSM metni zorunlu). */
export function createMap(container: HTMLElement, center: LatLng, zoom: number): MlMap {
  return new maplibregl.Map({
    container,
    style: loadStyleUrl(),
    center: [center.lng, center.lat],
    zoom,
    attributionControl: { compact: false },
  });
}

/** `mapPins.ts` HTML'ini MapLibre işaretçisine sarar; pin kuyruğu noktayı gösterir → anchor "bottom".
    Koordinat MapLibre'de [lng, lat]. */
export function toMarker(el: HTMLElement, lngLat: LatLng, opts?: { draggable?: boolean }): Marker {
  return new maplibregl.Marker({ element: el, anchor: "bottom", draggable: opts?.draggable ?? false })
    .setLngLat([lngLat.lng, lngLat.lat]);
}

const EARTH_KM_PER_DEG = 111.32;

/** Yarıçap çemberi: MapLibre'de Circle nesnesi yok, GeoJSON çokgen çizilir. */
export function circleGeoJson(center: LatLng, radiusKm: number, steps = 64) {
  const dLat = radiusKm / EARTH_KM_PER_DEG;
  const cos = Math.max(Math.abs(Math.cos((center.lat * Math.PI) / 180)), 1e-6);
  const dLng = radiusKm / (EARTH_KM_PER_DEG * cos);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } }],
  };
}
