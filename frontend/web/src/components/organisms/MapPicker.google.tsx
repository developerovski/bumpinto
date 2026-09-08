/* Google Maps nokta seçici — motor anahtarı ./MapPicker.tsx (spec §7). */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAP_ID, loadMaps, mapsConfigured, trackMapInstance } from "../../lib/maps";
import type { LatLng } from "../../lib/geo";
import { reverseGeocode } from "../../lib/geocode";
import { Button, Note } from "../atoms";
import type { MapPickerProps } from "./MapPicker";

/** Tek nokta toplayan harita. `MapView` genişletilmedi: o katılımcı/mekan çizip kamera
    sığdırıyor, bu tek koordinat topluyor — aynı bileşene sıkıştırmak ikisini de bozar.
    Ortak olan `loadMaps`/`MAP_ID` zaten ayrı modülde.

    Ters geocode ONAYDA bir kez çalışır, sürüklemede değil: uç sunucuda rate-limit'li (30/dk). */
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

export default function MapPickerGoogle(props: MapPickerProps) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [point, setPoint] = useState<LatLng>(props.center);
  const [busy, setBusy] = useState(false);
  /** Harita yuklenemedi: onay dugmesi KILITLENIR, yoksa kullanici hic gormedigi bir
      koordinati onaylar ve oturum yanlis yerde kurulur. */
  const [failed, setFailed] = useState(false);
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
        // Bos catch, kullaniciya GORMEDIGI bir koordinati onaylatirdi.
        if (alive) setFailed(true);
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
      {/* Artboard 3879/3953: ipucu haritanın ÜSTÜNDE — kullanıcı ne yapacağını dokunmadan önce okur. */}
      <Note>{t("map.pickHint")}</Note>
      <div className={`overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${props.heightClass ?? "h-[16rem]"}`}>
        {configured && !failed ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.notConfigured")}</Note>
          </div>
        )}
      </div>
      {/* Artboard 3892–3895: İptal ÖNCE (`.b-gh`), Burayı seç sonra (`.b-fl`); ikisi de `flex:1`.
          Genişlik saracak div'den gelir — Button kendi `className`'ini üretir, dışarıdan almaz. */}
      <div className="flex gap-2.5">
        <div className="flex-1">
          <Button type="button" kind="ghost" onClick={props.onCancel}>
            {t("map.pickCancel")}
          </Button>
        </div>
        <div className="flex-1">
          <Button type="button" onClick={() => void confirm()} disabled={busy || !configured || failed}>
            {t("map.pickConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
