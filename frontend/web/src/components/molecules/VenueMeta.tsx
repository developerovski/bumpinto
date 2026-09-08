import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { formatRating } from "../../lib/format";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { taglineOf } from "../../lib/venueText";
import RangeBar from "./RangeBar";

/** Mekan satırı gövdesi (artboard `.vrow`): ★ puan · fiyat · bugünün saati · semt, altında
    "neyle bilinir" ve yol çubuğu. Adalet rozeti KALKTI (v3): aynı cümle `RangeBar`ın `.rg-g`
    satırında yaşıyor. `ratingCount` kasıtlı olarak YOK (§4.9). */
export default function VenueMeta(props: { venue: VenueDto; travel: TravelInfo; midpointLabel?: string }) {
  const { t } = useTranslation();
  const v = props.venue;
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  // Semt YALNIZ orta nokta etiketinden farklıysa (§4.9).
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;
  const tagline = taglineOf(v);
  // Artboard W3b: "★ 4.6 · €€ · Bugün 08:00–18:00 · merkez" — saat listede de basılır (R-W8).
  const parts = [
    v.rating != null ? `★ ${formatRating(v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    v.hoursToday ? t("venue.hoursToday", { hours: v.hoursToday }) : null,
    locality,
  ].filter((p): p is string => !!p);

  return (
    <>
      {parts.length > 0 && <span className="text-[0.75rem] text-ink2 tabular-nums">{parts.join(" · ")}</span>}
      {/* Alan gelmezse satır HİÇ çizilmez (R-W8). */}
      {tagline && <span className="text-[0.75rem] text-ink2">{tagline}</span>}
      <RangeBar venue={v} travel={props.travel} />
    </>
  );
}
