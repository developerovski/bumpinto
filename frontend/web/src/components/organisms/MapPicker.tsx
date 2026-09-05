import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAP_ID, loadMaps, mapsConfigured, trackMapInstance } from "../../lib/maps";
import type { LatLng } from "../../lib/geo";
import { reverseGeocode } from "../../lib/geocode";
import { Button, Note } from "../atoms";

/** Tek nokta toplayan harita. `MapView` genişletilmedi: o katılımcı/mekan çizip kamera
    sığdırıyor, bu tek koordinat topluyor — aynı bileşene sıkıştırmak ikisini de bozar.
    Ortak olan `loadMaps`/`MAP_ID` zaten ayrı modülde.

    Ters geocode ONAYDA bir kez çalışır, sürüklemede değil: Nominatim kullanım politikası
    saniyede bir isteği aşan trafiği kabul etmiyor. */
const PICK_ZOOM = 13;

type MarkerPosition = google.maps.marker.AdvancedMarkerElement["position"];

/** `marker.position` sürükleme sonrası `LatLng` döndürebilir — orada `lat`/`lng` birer
    FONKSİYONdur, düz nesnede ise sayı. İkisini tek biçime indiriyoruz; doğrudan `Number(p.lat)`
    fonksiyon halinde NaN verirdi. */
function toLatLng(p: MarkerPosition): LatLng | null {
  if (!p) return null;
  return {
    lat: typeof p.lat === "function" ? p.lat() : p.lat,
    lng: typeof p.lng === "function" ? p.lng() : p.lng,
  };
}

export default function MapPicker(props: {
  center: LatLng;
  onPick: (loc: { lat: number; lng: number; label: string | null }) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [point, setPoint] = useState<LatLng>(props.center);
  const [busy, setBusy] = useState(false);
  const configured = mapsConfigured();

  useEffect(() => {
    if (!configured || !box.current) return;
    let alive = true;
    loadMaps(i18n.language)
      .then(() => {
        if (!alive || !box.current) return;
        const map = new google.maps.Map(box.current, {
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          center: props.center,
          zoom: PICK_ZOOM,
        });
        trackMapInstance();
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: props.center,
          gmpDraggable: true,
        });
        markerRef.current = marker;
        marker.addListener("dragend", () => {
          const p = toLatLng(marker.position);
          if (p) setPoint(p);
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.position = next;
          setPoint(next);
        });
      })
      .catch(() => {
        /* yapılandırma yoksa aşağıdaki not zaten basılı */
      });
    return () => {
      alive = false;
    };
    // yalnız ilk mount: merkez sonradan değişse kullanıcının seçimi ezilmemeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  async function confirm() {
    setBusy(true);
    try {
      const label = await reverseGeocode(point.lat, point.lng);
      props.onPick({ ...point, label });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[16rem] overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7]">
        {configured ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.notConfigured")}</Note>
          </div>
        )}
      </div>
      <Note>{t("map.pickHint")}</Note>
      <div className="flex gap-2">
        <Button type="button" size="fit" onClick={() => void confirm()} disabled={busy || !configured}>
          {t("map.pickConfirm")}
        </Button>
        <Button type="button" kind="white" size="fit" onClick={props.onCancel}>
          {t("map.pickCancel")}
        </Button>
      </div>
    </div>
  );
}
