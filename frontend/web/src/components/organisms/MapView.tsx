import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Note } from "../atoms";
import { MAP_ID, loadMaps, mapsConfigured, trackMapInstance } from "../../lib/maps";
import { MAX_FIT_ZOOM, cameraFor, cameraSignature } from "../../lib/mapCamera";
import type { LatLng } from "../../lib/geo";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { participantPin, venuePin } from "./mapPins";

export type MapViewProps = {
  participants: ParticipantDto[];
  venues: VenueDto[];
  midpoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  selectedVenueId?: string | null;
  onSelectVenue?: (venueId: string | null) => void;
  /** Katılımcı id → pin altı etiket ("sen" vb.). */
  pinLabels?: Record<string, string>;
  /** Fotoğrafsız tint (etkinlik grubu 0–3) — venuePin swatch'ı. */
  tint?: number;
  /** Mekan pini metni: varsayılan puan; "name" → mekan adı (Karar ekranı). */
  venueLabel?: "rating" | "name";
  /** Sol-alt kapsül (artboard .mcap). */
  caption?: string;
  heightClass?: string;
  /** 390 artboardlarında (Katıl/Bekle/Karar) harita gizli — yalnız lg+ görünür. */
  lgOnly?: boolean;
};

/** Seçilen mekana yakınlaşma ölçeği (sokak/mahalle seviyesi). */
const VENUE_ZOOM = 15;
/** Kamera geçişi süresi (ms) — hover'la gezerken bunaltmayacak kadar kısa. */
const CAMERA_MS = 500;
/** Seçim oturmadan kamera oynamasın: listede fareyle hızla gezerken her satır için animasyon
    başlatmak yerine seçim bu kadar sabit kalınca hareket edilir. */
const SETTLE_MS = 200;

type Cam = { center: LatLng; zoom: number };

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Kamerayı hedefe yumuşakça taşır (konum + ölçek birlikte). `moveCamera` kesirli zoom kabul
    eder (vektör harita); yoksa tek adımda kurulur. Yeni çağrı öncekini iptal eder. */
function animateCamera(map: google.maps.Map, to: Cam, instant: boolean, frame: { id: number | null }) {
  if (frame.id != null) cancelAnimationFrame(frame.id);
  frame.id = null;
  const move = (center: LatLng, zoom: number) => {
    const m = map as google.maps.Map & { moveCamera?: (o: { center: LatLng; zoom: number }) => void };
    if (typeof m.moveCamera === "function") m.moveCamera({ center, zoom });
    else {
      map.setCenter(center);
      map.setZoom(Math.round(zoom));
    }
  };
  const c = map.getCenter();
  const from: Cam = {
    center: { lat: c?.lat() ?? to.center.lat, lng: c?.lng() ?? to.center.lng },
    zoom: map.getZoom() ?? to.zoom,
  };
  if (instant || typeof requestAnimationFrame === "undefined" || typeof performance === "undefined") {
    move(to.center, to.zoom);
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / CAMERA_MS);
    const e = easeInOut(p);
    move(
      {
        lat: from.center.lat + (to.center.lat - from.center.lat) * e,
        lng: from.center.lng + (to.center.lng - from.center.lng) * e,
      },
      from.zoom + (to.zoom - from.zoom) * e,
    );
    frame.id = p < 1 ? requestAnimationFrame(step) : null;
  };
  frame.id = requestAnimationFrame(step);
}

/** Saf kamera kararını Google'a uygular. Yakın iki pinde fitBounds'un aşırı zoom'u kırpılır.
    `onSettled` kadraj oturunca çağrılır — seçim kalkınca dönülecek "ev" kamerası budur. */
function applyCamera(map: google.maps.Map, camera: ReturnType<typeof cameraFor>, onSettled?: (home: Cam) => void) {
  if (!camera) return;
  const settle = () => {
    const c = map.getCenter();
    if (c) onSettled?.({ center: { lat: c.lat(), lng: c.lng() }, zoom: map.getZoom() ?? 0 });
  };
  if (camera.kind === "point") {
    map.setCenter(camera.center);
    map.setZoom(camera.zoom);
    onSettled?.({ center: camera.center, zoom: camera.zoom });
    return;
  }
  // Üstte pin gövdesi + etiket (~64px) noktanın ÜZERİNE çizilir; eşit 48px dolgu pini kırpıyordu.
  map.fitBounds(new google.maps.LatLngBounds(camera.sw, camera.ne), { top: 88, right: 56, bottom: 56, left: 56 });
  google.maps.event.addListenerOnce(map, "idle", () => {
    if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    settle();
  });
}

export default function MapView(props: MapViewProps) {
  const { participants, venues, midpoint, radiusKm, selectedVenueId, onSelectVenue, pinLabels, tint, venueLabel, caption, heightClass, lgOnly } = props;
  const { t, i18n } = useTranslation();
  const configured = mapsConfigured();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  /** Son sığdırılan coğrafi imza — aynı kaldığı sürece kullanıcının pan/zoom'una dokunulmaz. */
  const fittedRef = useRef<string | null>(null);
  /** Seçim kalkınca dönülecek kadraj (herkesi + çemberi kapsayan "ev" kamerası). */
  const homeRef = useRef<Cam | null>(null);
  /** Süren kamera animasyonunun rAF kimliği — yeni hedef öncekini iptal eder. */
  const frameRef = useRef<{ id: number | null }>({ id: null });
  // Reaktif — tek seferlik okumanın aksine pencere sonradan lg genişliğe geçerse de doğru davranır.
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (!configured || !box.current) return;
    if (lgOnly && !desktop) return;
    let alive = true;
    loadMaps(i18n.language)
      .then(() => {
        if (!alive || !box.current) return;
        mapRef.current = new google.maps.Map(box.current, {
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          center: midpoint ?? { lat: 51.44, lng: 5.47 },
          zoom: 10, // ilk kare; içerik gelince applyCamera devralır
        });
        trackMapInstance();
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
    // BILINEN KUSUR (spec R3, bu işin kapsamı DEĞİL): `desktop` reaktif olduğu için pencere
    // 1024px'i geçince effect yeniden koşar ve YENİ bir harita örneği kurulur; temizlik
    // yalnız `alive`i düşürüyor, eski haritayı yıkmıyor. Ölçüm `trackMapInstance` ile
    // görünür; sayılar düzeltmeyi gerekçelendirdiğinde ayrı bir iz açılır.
  }, [configured, lgOnly, desktop]);

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
    if (!ready || !mapRef.current || !window.google) return;
    const map = mapRef.current;
    const detach = () => {
      markersRef.current.forEach((m) => {
        google.maps.event.clearInstanceListeners(m);
        m.map = null;
      });
      markersRef.current = [];
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
    detach();
    const { AdvancedMarkerElement } = google.maps.marker;
    participants.forEach((p, i) => {
      if (p.approxLocation?.lat == null || p.approxLocation?.lng == null) return;
      const pos = { lat: p.approxLocation.lat, lng: p.approxLocation.lng };
      markersRef.current.push(
        new AdvancedMarkerElement({
          map,
          position: pos,
          content: participantPin(p, i, pinLabels?.[p.id ?? ""]),
          zIndex: 5, // mekan pinlerinin (2–3) ve orta noktanın üstünde
          title: `${p.displayName ?? ""}${p.locationLabel ? " · " + p.locationLabel : ""}`,
        }),
      );
    });
    // Orta nokta İĞNESİ çizilmez (UI review 2026-09-03: kalabalık haritada gürültü yapıyordu ve
    // "bu pin ne?" sorusunu doğuruyordu). Alan yalnız yarıçap çemberiyle anlatılır; orta noktanın
    // adı ve süreleri Lobi/Bekle'deki `MidpointCard`'da yazılı olarak zaten var.
    if (midpoint) {
      if (radiusKm) {
        circleRef.current = new google.maps.Circle({
          map,
          center: midpoint,
          radius: radiusKm * 1000,
          strokeColor: "#DE2456",
          strokeOpacity: 0.35,
          strokeWeight: 2,
          fillOpacity: 0,
        });
      }
    }
    venues.forEach((v) => {
      if (v.lat == null || v.lng == null) return;
      const pos = { lat: v.lat, lng: v.lng };
      const selected = v.id === selectedVenueId;
      const marker = new AdvancedMarkerElement({
        map,
        position: pos,
        content: venuePin(v, tint ?? 0, selected, venueLabel === "name" ? v.name : undefined),
        zIndex: selected ? 3 : 2,
      });
      marker.addListener("click", () => onSelectVenue?.(v.id ?? null));
      markersRef.current.push(marker);
    });
    // Kamera coğrafi içerik değişince sığdırılır (yeni katılımcı, orta nokta, mekanlar);
    // seçim/etiket değişiminde kullanıcının pan/zoom'u korunur.
    if (fittedRef.current !== camera) {
      fittedRef.current = camera;
      applyCamera(map, cameraFor(points, midpoint, radiusKm), (home) => {
        homeRef.current = home;
      });
    }
    return detach;
    // içerik imzası: polling her 3 sn yeni dizi üretir, pinler yalnız veri değişince yeniden çizilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature, camera, t]);

  // Kap boyutu değişince (lg'de harita viewport yüksekliğine geçer, pencere büyür/küçülür)
  // kamera yeniden sığdırılır; aksi hâlde ilk küçük kadraja göre hesaplanan fit katılımcıları
  // dışarıda bırakıyordu (UI review). Kullanıcının pan/zoom'u yalnız boyut değişiminde bozulur.
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
      applyCamera(map, cameraFor(points, midpoint, radiusKm), (home) => {
        homeRef.current = home;
      });
    });
    ro.observe(box.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, camera]);

  // Seçim varsa mekana yumuşakça yakınlaşılır; seçim kalkınca "ev" kadrajına aynı yumuşaklıkta
  // dönülür (UI review 2026-09-03). Seçim SETTLE_MS boyunca sabit kalmadan kamera oynamaz —
  // listede fareyle hızla gezerken harita zıplamaz.
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
    const timer = setTimeout(
      () => animateCamera(map, target, reduceMotion, frameRef.current),
      reduceMotion ? 0 : SETTLE_MS,
    );
    return () => clearTimeout(timer);
  }, [ready, selectedVenueId, selLat, selLng, reduceMotion]);

  // Bileşen kalkarken süren animasyonu bırak.
  useEffect(() => {
    const frame = frameRef.current;
    return () => {
      if (frame.id != null) cancelAnimationFrame(frame.id);
    };
  }, []);

  const summary = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation.lng != null)
    .map((p) => `${p.displayName ?? ""} · ${p.locationLabel ?? ""}`.trim())
    .join(", ");

  return (
    <div
      data-testid="mapview"
      className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${heightClass ?? "h-[20rem]"} ${lgOnly ? "hidden lg:block" : ""}`}
    >
      {configured && !failed && <div ref={box} className="h-full w-full" />}
      {(!configured || failed) && (
        <div className="flex h-full items-center justify-center p-6">
          <Note center>{t("map.notConfigured")}</Note>
        </div>
      )}
      {caption && (
        <span className="absolute bottom-2.5 left-3.5 inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.92)] px-[0.6875rem] py-1.5 text-[0.75rem] font-bold text-ink">
          {caption}
        </span>
      )}
      <p className="sr-only">{summary}</p>
    </div>
  );
}
