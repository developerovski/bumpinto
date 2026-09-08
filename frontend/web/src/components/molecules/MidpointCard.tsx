/* Karar dokümanı §5.C "Lobi/Bekle" — harita şeridi yerine orta nokta kartı. `.c-mark` glifi
   MapMark'tan; harita YOK (§4.7). B-7:T1 (`midpointMinutes`) ve B-7:T3 (`midpointLabel`) artık
   `@bumpinto/shared`'ın üretilmiş tiplerinde — ayrı bir köprü dosyası gerekmiyor.
   OSM atfı: `midpointLabel` Nominatim/OSM ters coğrafi kodlamasından gelir, ekranda OSM verisi
   YAZILIYORSA atıf da yazılmalı. AppShell altbilgisinde atıf YOK (yalnız yasal bağlantılar var —
   eski yorum yanlıştı), harita da mount edilmemiş olabilir (o zaman maplibre'nin kendi atıf
   denetimi de yok). Bu yüzden atıf kartın altında basılır (artboard W3 390 · 1200). */
import { MapTrifold } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { nearestParticipant } from "../../lib/midpoint";
import { MODE_LABEL_KEY } from "../../lib/travelMode";
import { Note, Overline } from "../atoms";
import MapMark from "./MapMark";

export default function MidpointCard(props: {
  view: SessionView;
  /** Artboard W3 390 · 1198 `.icb` — harita HENÜZ açılmamışken kartın sağındaki 40px ikon
      düğme. Verilmezse düğme hiç basılmaz (1280'de harita zaten mount edilmiş olur). */
  onOpenMap?: () => void;
  /** Artboard: atıf bölgenin sonunda basılıyorsa kart onu tekrar basmaz. */
  attribution?: boolean;
}) {
  const { t } = useTranslation();
  const v = props.view;
  // B-7:T1 `midpointMinutes`: konumu olan HERKESİN orta noktaya dakikası (5 dk'ya yuvarlı).
  // Konumsuz katılımcı alanı boş döner ve aralığa girmez — istemci türetmesi YOK.
  const mins = (v.participants ?? [])
    .map((p) => p.midpointMinutes)
    .filter((m): m is number => m != null);
  const range = mins.length > 0 ? { min: Math.min(...mins), max: Math.max(...mins) } : null;
  const km = v.radiusKm != null ? Math.round(v.radiusKm) : null;
  const near = nearestParticipant(v);
  const anchored = v.anchored === true;

  return (
    <>
      <div className="flex items-center gap-4 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
        <MapMark pinOnly={anchored} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Overline>{anchored ? t("midpoint.anchorOverline") : t("midpoint.overline")}</Overline>
          <h2 className="text-[1.125rem]">
            {v.midpointLabel
              ? t(anchored ? "midpoint.anchorNear" : "midpoint.near", { label: v.midpointLabel })
              : t("midpoint.title")}
          </h2>
          <span className="text-[0.8125rem] text-ink2 tabular-nums">
            {anchored
              ? km != null ? t("midpoint.anchorMeta", { km }) : t("midpoint.anchorPending")
              : km != null && range
                ? t("midpoint.meta", { km, min: range.min, max: range.max })
                : km != null
                  ? t("midpoint.metaKm", { km })
                  : t("midpoint.pending")}
          </span>
          {!anchored && near?.travelMode && near.travelMode !== "CAR" && (
            // TÜRKÇE EK YOK: "Orta nokta {{name}} tarafında · bisikletle geliyor"
            <Note>
              {t("midpoint.sideNote", {
                name: near.displayName ?? "",
                mode: t(MODE_LABEL_KEY[near.travelMode].coming),
              })}
            </Note>
          )}
        </div>
        {props.onOpenMap && (
          <button
            type="button"
            aria-label={t("lobby.showOnMap")}
            onClick={props.onOpenMap}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line2 bg-card text-ink shadow-sh1"
          >
            <MapTrifold size={18} aria-hidden />
          </button>
        )}
      </div>
      {/* Atıf yalnız OSM verisi ekrandayken: etiket yoksa kart "Orta nokta" der ve ortada
          gösterilecek bir OSM verisi kalmaz. Lobi'de atıf bölgenin SONUNDA basılır (artboard
          1149), o yüzden `attribution={false}` ile kapatılabiliyor. */}
      {props.attribution !== false && v.midpointLabel && (
        <span className="self-center text-[0.6875rem] tracking-[0.02em] text-ink2">
          {t("attribution.osm")}
        </span>
      )}
    </>
  );
}
