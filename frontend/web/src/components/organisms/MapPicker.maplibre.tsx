/* MapLibre nokta seçici (spec §7). Onay kuralı Google dalıyla AYNI: harita görünmüyorsa kullanıcı
   GÖRMEDİĞİ bir koordinatı onaylayamaz. */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng } from "../../lib/geo";
import { reverseGeocode } from "../../lib/geocode";
import { createMap, toMarker } from "../../lib/maplibre";
import { Button, Note } from "../atoms";
import type { MapPickerProps } from "./MapPicker";
import { pickPin } from "./mapPins";

const PICK_ZOOM = 13;

export default function MapPickerMapLibre(props: MapPickerProps) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const loaded = useRef(false);
  const [point, setPoint] = useState<LatLng>(props.center);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const map = createMap(box.current, props.center, PICK_ZOOM);
    mapRef.current = map;
    const marker = toMarker(pickPin(), props.center, { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      setPoint({ lat: p.lat, lng: p.lng });
    });
    map.on("click", (e: { lngLat: { lat: number; lng: number } }) => {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      setPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    map.on("load", () => { loaded.current = true; });
    // Tek tile 404'u calisan haritayi dusurmez: yalniz yuklenmeden onceki hata basarisiz sayilir.
    map.on("error", () => { if (!loaded.current) setFailed(true); });
    return () => {
      marker.remove();
      mapRef.current = null;
      map.remove();
    };
    // yalnız ilk mount: merkez sonradan değişse kullanıcının seçimi ezilmemeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {!failed ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.engineUnavailable")}</Note>
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
          <Button type="button" onClick={() => void confirm()} disabled={busy || failed}>
            {t("map.pickConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
