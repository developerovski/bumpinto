/* Karar dokümanı §5.C "Lobi/Bekle" — harita şeridi yerine orta nokta kartı. `.c-mark` glifi
   MapMark'tan; harita YOK (§4.7). B-7:T1 (`midpointMinutes`) ve B-7:T3 (`midpointLabel`) artık
   `@bumpinto/shared`'ın üretilmiş tiplerinde — ayrı bir köprü dosyası gerekmiyor.
   OSM atfı (orta nokta etiketi Nominatim/OSM'den gelir) AppShell'in genel altbilgisinde
   (`t("attribution.osm")`) her sayfada zaten basılı — burada tekrarlanmaz. */
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { nearestParticipant } from "../../lib/midpoint";
import { MODE_LABEL_KEY } from "../../lib/travelMode";
import { Note, Overline } from "../atoms";
import MapMark from "./MapMark";

export default function MidpointCard(props: { view: SessionView }) {
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
    <div className="flex items-center gap-4 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
      <MapMark />
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
        {near?.travelMode && near.travelMode !== "CAR" && (
          // TÜRKÇE EK YOK: "Orta nokta {{name}} tarafında · bisikletle geliyor"
          <Note>
            {t("midpoint.sideNote", {
              name: near.displayName ?? "",
              mode: t(MODE_LABEL_KEY[near.travelMode].coming),
            })}
          </Note>
        )}
      </div>
    </div>
  );
}
