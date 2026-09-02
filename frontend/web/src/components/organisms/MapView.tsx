import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Note } from "../atoms";
import { MAP_ID, loadMaps, mapsConfigured } from "../../lib/maps";
import { midpointPin, participantPin, venuePin } from "./mapPins";

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
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!configured || !box.current) return;
    if (lgOnly && !window.matchMedia("(min-width: 1024px)").matches) return;
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
          zoom: 10,
        });
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [configured, lgOnly]);

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
    const bounds = new google.maps.LatLngBounds();
    const { AdvancedMarkerElement } = google.maps.marker;
    participants.forEach((p, i) => {
      if (p.approxLocation?.lat == null || p.approxLocation?.lng == null) return;
      const pos = { lat: p.approxLocation.lat, lng: p.approxLocation.lng };
      markersRef.current.push(
        new AdvancedMarkerElement({
          map,
          position: pos,
          content: participantPin(p, i, pinLabels?.[p.id ?? ""]),
          title: `${p.displayName ?? ""}${p.locationLabel ? " · " + p.locationLabel : ""}`,
        }),
      );
      bounds.extend(pos);
    });
    if (midpoint) {
      markersRef.current.push(new AdvancedMarkerElement({ map, position: midpoint, content: midpointPin() }));
      bounds.extend(midpoint);
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
      bounds.extend(pos);
    });
    // Kamera yalnız ilk çizimde sığdırılır — seçim değişince kullanıcının pan/zoom'u korunur.
    if (!fittedRef.current && !bounds.isEmpty()) {
      map.fitBounds(bounds, 48);
      fittedRef.current = true;
    }
    return detach;
    // içerik imzası: polling her 3 sn yeni dizi üretir, pinler yalnız veri değişince yeniden çizilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature]);

  const summary = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation.lng != null)
    .map((p) => `${p.displayName ?? ""} · ${p.locationLabel ?? ""}`.trim())
    .join(", ");

  return (
    <div className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${heightClass ?? "h-[20rem]"} ${lgOnly ? "hidden lg:block" : ""}`}>
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
