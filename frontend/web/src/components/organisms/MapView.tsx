/* Harita motoru anahtarı (spec §7): motor SUNUCUDAN gelir, yalnız seçilenin paketi indirilir.
   Prop arayüzü DEĞİŞMEZ — çağıran sayfalar bu dosyayı lazy import etmeye devam eder. */
import { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Note } from "../atoms";
import { effectiveConfig, useConfigStore } from "../../store/configStore";
import MapFrame from "./MapFrame";

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

const GoogleEngine = lazy(() => import("./MapView.google"));
const MapLibreEngine = lazy(() => import("./MapView.maplibre"));

export default function MapView(props: MapViewProps) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  const failed = useConfigStore((s) => s.failed);
  const load = useConfigStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]); // derin bağlantıda açılış çağrısı kaçtıysa

  const placeholder = (text: string) => (
    <MapFrame heightClass={props.heightClass} lgOnly={props.lgOnly} caption={props.caption}>
      <div className="flex h-full items-center justify-center p-6">
        <Note center>{text}</Note>
      </div>
    </MapFrame>
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
