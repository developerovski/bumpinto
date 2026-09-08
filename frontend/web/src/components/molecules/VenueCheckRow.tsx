/* Kaynak: artboard `W6c · Liste modu 390` (2289-2349) — liste satırı polaroid DEĞİL, "Beğendiklerin"
   ile aynı `.f-lk` satırıdır: 44×44 küçük görsel + ad + uyum satırı + `.mi` + `.rg` bandı + 26px
   `.chk` dairesi. 12 mekanda 12 polaroid ekranı üç kat uzatıyor ve deste kartıyla aynı görsel
   ağırlığı taşıyordu; liste "gözden geçir + düzelt" ekranı, deste anı değil.
   Satır başına atıf YOK (12 satır × 2 satır olurdu) — tek birleşik atıf listenin altında
   (bkz. `DeckScreen`, reviewer bulgusu). */
import { Check } from "@phosphor-icons/react";
import type { VenueDto } from "@bumpinto/shared";
import { formatRating } from "../../lib/format";
import type { TravelInfo } from "../../lib/useTravelLabels";
import ActivityBadge from "./ActivityBadge";
import { CHECK_PEER } from "./checkStyles";
import FitLine from "./FitLine";
import RangeBar from "./RangeBar";
import VenueThumb from "./VenueThumb";

export default function VenueCheckRow(props: {
  venue: VenueDto;
  checked: boolean;
  onChange: (checked: boolean) => void;
  travel?: TravelInfo;
  /** Oturum >1 ilgi alanı taşıyorsa satır kendi rozetini basar. */
  mixedDeck?: boolean;
  categories?: string[];
  midpointLabel?: string;
}) {
  const v = props.venue;
  const travel = props.travel ?? { labels: {} };
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  // Semt YALNIZ orta nokta şehrinden farklıysa gösterilir — aynıysa tekrar (§4.9, VenueCard ile aynı kural).
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;
  const hasMeta = v.rating != null || hasPrice || !!locality;

  return (
    // Artboard 2290: `.f-lk` liste modunda daha sıkı — padding 9px 14px, gövde gap 3px.
    <label className="flex cursor-pointer items-start gap-[0.6875rem] px-[0.875rem] py-[0.5625rem]">
      {/* Görünüm artboard'ın `.chk` dairesi, davranış gerçek onay kutusu: `sr-only` girdi odak,
          klavye ve ekran okuyucu için DOM'da kalır, daire onun `peer` durumundan boyanır. */}
      <input
        type="checkbox"
        className="peer sr-only"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <VenueThumb venue={v} tint={0} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
        <h3>{v.name}</h3>
        <FitLine venue={v} categories={props.categories ?? []} />
        {props.mixedDeck && v.activityType && (
          <span className="flex">
            <ActivityBadge activity={v.activityType} />
          </span>
        )}
        {/* Artboard 2294: "★ 4.3 · € · Best" — TEK meta satırı. */}
        {hasMeta && (
          <span className="text-[0.75rem] text-ink2 tabular-nums">
            {v.rating != null && `★ ${formatRating(v.rating, v.ratingScale)}`}
            {v.rating != null && hasPrice && " · "}
            {hasPrice && "€".repeat(v.priceLevel!)}
            {(v.rating != null || hasPrice) && locality && " · "}
            {locality}
          </span>
        )}
        {/* Dar satırda kişi başı `.tb` çubukları değil `.rg` bandı — artboard 2295. */}
        <RangeBar venue={v} travel={travel} />
      </div>
      <span className={CHECK_PEER}>
        <Check size={14} weight="bold" aria-hidden />
      </span>
    </label>
  );
}
