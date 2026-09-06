/* Harita motoru anahtarı (spec §7): motor SUNUCUDAN gelir, yalnız seçilenin paketi indirilir.
   Prop arayüzü DEĞİŞMEZ — çağıran ekranlar bu dosyayı lazy import etmeye devam eder. */
import { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LatLng } from "../../lib/geo";
import { effectiveConfig, useConfigStore } from "../../store/configStore";
import { Note } from "../atoms";

export type MapPickerProps = {
  center: LatLng;
  onPick: (loc: { lat: number; lng: number; label: string | null }) => void;
  onCancel: () => void;
};

const GoogleEngine = lazy(() => import("./MapPicker.google"));
const MapLibreEngine = lazy(() => import("./MapPicker.maplibre"));

export default function MapPicker(props: MapPickerProps) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  const failed = useConfigStore((s) => s.failed);
  const load = useConfigStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]); // derin bağlantıda açılış çağrısı kaçtıysa

  const placeholder = (text: string) => (
    <div className="flex flex-col gap-2">
      <div className="flex h-[16rem] items-center justify-center overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] p-6">
        <Note center>{text}</Note>
      </div>
    </div>
  );

  if (!config && !failed) return placeholder(t("map.loading"));
  const engine = effectiveConfig({ config }).mapEngine;
  const Engine = engine === "google" ? GoogleEngine : MapLibreEngine;
  return (
    <Suspense fallback={placeholder(t("map.loading"))}>
      <Engine {...props} />
    </Suspense>
  );
}
