/* MapLibre uygulaması — motor anahtarı ./MapView.tsx'te (spec §7). Faturasız açık motor:
   `trackMapInstance` BİLEREK çağrılmaz (yalnız Google örnek başı ücretlendirir). */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Note } from "../atoms";
import type { LatLng } from "../../lib/geo";
import { MAX_FIT_ZOOM, type Camera, cameraFor, cameraSignature } from "../../lib/mapCamera";
import { circleGeoJson, createMap, toMarker } from "../../lib/maplibre";
import { useMediaQuery } from "../../lib/useMediaQuery";
import MapFrame from "./MapFrame";
import type { MapViewProps } from "./MapView";
import { participantPin, venuePin } from "./mapPins";

/** Seçilen mekana yakınlaşma ölçeği (sokak/mahalle seviyesi). */
const VENUE_ZOOM = 15;
/** Kamera geçişi süresi (ms). */
const CAMERA_MS = 500;
/** Yarıçap çemberinin kaynak + katman kimliği. */
const CIRCLE = "bumpinto-radius";

type Cam = { center: LatLng; zoom: number };

/** Saf kamera kararını MapLibre'nin anlayacağı merkez+zoom'a çevirir. `cameraForBounds`
    Google'ın fitBounds'una karşılık gelir; aşırı zoom'u aynı MAX_FIT_ZOOM ile kırpar. */
function camOf(map: MlMap, camera: Camera): Cam {
  if (camera.kind === "point") return { center: camera.center, zoom: camera.zoom };
  const fit = map.cameraForBounds(
    [
      [camera.sw.lng, camera.sw.lat],
      [camera.ne.lng, camera.ne.lat],
    ],
    { padding: { top: 88, right: 56, bottom: 56, left: 56 } },
  );
  if (!fit) {
    // cameraForBounds boş dönerse SW köşesi değil, sınırların ortası + haritanın MEVCUT zoom'u kullanılır.
    const mid = { lat: (camera.sw.lat + camera.ne.lat) / 2, lng: (camera.sw.lng + camera.ne.lng) / 2 };
    return { center: mid, zoom: map.getZoom() };
  }
  const c = fit.center as { lng: number; lat: number };
  return { center: { lat: c.lat, lng: c.lng }, zoom: Math.min(fit.zoom ?? MAX_FIT_ZOOM, MAX_FIT_ZOOM) };
}

/** Kamerayı hedefe taşır — `instant` (reduceMotion) tek adımda, aksi hâlde yumuşak geçiş. */
function moveTo(map: MlMap, cam: Cam, instant: boolean) {
  const target = { center: [cam.center.lng, cam.center.lat] as [number, number], zoom: cam.zoom };
  if (instant) map.jumpTo(target);
  else map.easeTo({ ...target, duration: CAMERA_MS });
}

/** Yarıçap çemberi: MapLibre'de Circle nesnesi yok, GeoJSON çokgen + çizgi katmanı. Kaynak
    zaten varsa yalnız veri güncellenir (kaynak/katman baştan kurulmaz). */
function drawCircle(map: MlMap, midpoint: LatLng | null, radiusKm: number | null) {
  if (!midpoint || !radiusKm) {
    if (map.getLayer(CIRCLE)) map.removeLayer(CIRCLE);
    if (map.getSource(CIRCLE)) map.removeSource(CIRCLE);
    return;
  }
  const data = circleGeoJson(midpoint, radiusKm);
  const source = map.getSource(CIRCLE) as unknown as { setData: (d: typeof data) => void } | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(CIRCLE, { type: "geojson", data });
  map.addLayer({
    id: CIRCLE,
    type: "line",
    source: CIRCLE,
    paint: { "line-color": "#DE2456", "line-opacity": 0.35, "line-width": 2 },
  });
}

export default function MapView(props: MapViewProps) {
  const { participants, venues, midpoint, radiusKm, selectedVenueId, onSelectVenue, pinLabels, tint, venueLabel, caption, heightClass, lgOnly } = props;
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  /** Son sığdırılan coğrafi imza — aynı kaldığı sürece kullanıcının pan/zoom'una dokunulmaz. */
  const fittedRef = useRef<string | null>(null);
  /** Seçim kalkınca dönülecek kadraj (herkesi + çemberi kapsayan "ev" kamerası). */
  const homeRef = useRef<Cam | null>(null);
  /** `load`'dan önceki hata haritayı düşürür, sonraki (tek tile 404 gibi) düşürmez. */
  const loaded = useRef(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (!box.current) return;
    if (lgOnly && !desktop) return;
    const map = createMap(box.current, midpoint ?? { lat: 51.44, lng: 5.47 }, 10);
    mapRef.current = map;
    loaded.current = false;
    map.on("load", () => {
      loaded.current = true;
      setReady(true);
    });
    // Tek tile 404'u calisan haritayi dusurmez: yalniz yuklenmeden onceki hata basarisiz sayilir.
    map.on("error", () => {
      if (!loaded.current) setFailed(true);
    });
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      homeRef.current = null;
      fittedRef.current = null;
      setReady(false);
      map.remove();
      mapRef.current = null;
      // Google yolundaki bilinen kusurun (spec R3: `desktop` değişince 1024px eşiğinde ikinci
      // örnek kalması) tersi: burada cleanup haritayı GERÇEKTEN yıkıyor.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgOnly, desktop]);

  const points: LatLng[] = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation?.lng != null)
    .map((p) => ({ lat: p.approxLocation!.lat!, lng: p.approxLocation!.lng! }))
    .concat(
      venues
        .filter((v) => v.lat != null && v.lng != null)
        .map((v) => ({ lat: v.lat!, lng: v.lng! })),
    );
  const camera = cameraSignature(points, midpoint, radiusKm);

  const signature = JSON.stringify([
    participants.map((p) => [p.id, p.approxLocation?.lat, p.approxLocation?.lng, p.manual, p.displayName, pinLabels?.[p.id ?? ""]]),
    venues.map((v) => [v.id, v.lat, v.lng, v.rating, v.name]),
    midpoint,
    radiusKm,
    selectedVenueId,
    tint,
    venueLabel,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    participants.forEach((p, i) => {
      if (p.approxLocation?.lat == null || p.approxLocation?.lng == null) return;
      const pos = { lat: p.approxLocation.lat, lng: p.approxLocation.lng };
      const el = participantPin(p, i, pinLabels?.[p.id ?? ""]);
      el.style.zIndex = "5"; // mekan pinlerinin (2–3) üstünde
      markersRef.current.push(toMarker(el, pos).addTo(map));
    });
    // Orta nokta İĞNESİ çizilmez (bkz. Google yolundaki aynı karar) — alan yalnız çemberle anlatılır.
    drawCircle(map, midpoint, radiusKm);
    venues.forEach((v) => {
      if (v.lat == null || v.lng == null) return;
      const pos = { lat: v.lat, lng: v.lng };
      const selected = v.id === selectedVenueId;
      const el = venuePin(v, tint ?? 0, selected, venueLabel === "name" ? v.name : undefined);
      el.style.zIndex = selected ? "3" : "2";
      el.addEventListener("click", () => onSelectVenue?.(v.id ?? null));
      markersRef.current.push(toMarker(el, pos).addTo(map));
    });
    // Kamera coğrafi içerik değişince sığdırılır; seçim/etiket değişiminde pan/zoom korunur.
    if (fittedRef.current !== camera) {
      fittedRef.current = camera;
      const cam = cameraFor(points, midpoint, radiusKm);
      if (cam) {
        const next = camOf(map, cam);
        homeRef.current = next;
        moveTo(map, next, reduceMotion);
      }
    }
    // içerik imzası: pinler/çember yalnız veri değişince yeniden çizilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature, camera]);

  // Kap boyutu değişince kamera yeniden sığdırılır (bkz. Google yolundaki aynı gerekçe).
  useEffect(() => {
    if (!ready || !box.current || typeof ResizeObserver === "undefined") return;
    let last = { w: box.current.clientWidth, h: box.current.clientHeight };
    const ro = new ResizeObserver(() => {
      const el = box.current;
      const map = mapRef.current;
      if (!el || !map) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === last.w && h === last.h) return;
      last = { w, h };
      if (w === 0 || h === 0) return;
      map.resize();
      const cam = cameraFor(points, midpoint, radiusKm);
      if (cam) {
        const next = camOf(map, cam);
        homeRef.current = next;
        moveTo(map, next, true);
      }
    });
    ro.observe(box.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, camera]);

  // Seçim varsa mekana yakınlaşılır; seçim kalkınca "ev" kadrajına dönülür.
  const selVenue = venues.find((v) => v.id === selectedVenueId);
  const selLat = selVenue?.lat ?? null;
  const selLng = selVenue?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const home = homeRef.current;
    const target: Cam | null =
      selLat != null && selLng != null
        ? { center: { lat: selLat, lng: selLng }, zoom: Math.max(home?.zoom ?? 0, VENUE_ZOOM) }
        : home;
    if (!target) return;
    moveTo(map, target, reduceMotion);
  }, [ready, selectedVenueId, selLat, selLng, reduceMotion]);

  const summary = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation.lng != null)
    .map((p) => `${p.displayName ?? ""} · ${p.locationLabel ?? ""}`.trim())
    .join(", ");

  return (
    <MapFrame heightClass={heightClass} lgOnly={lgOnly} caption={caption} summary={summary}>
      {!failed && <div ref={box} className="h-full w-full" />}
      {failed && (
        <div className="flex h-full items-center justify-center p-6">
          <Note center>{t("map.engineUnavailable")}</Note>
        </div>
      )}
    </MapFrame>
  );
}
