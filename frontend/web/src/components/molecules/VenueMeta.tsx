import type { VenueDto } from "@bumpinto/shared";
import i18n from "../../i18n";
import type { TravelInfo } from "../../lib/useTravelLabels";
import FairnessBadge from "./FairnessBadge";
import TravelChips from "./TravelChips";

/** Puan biçimi tek atomda yaşar (§4.9 "rating format unified") — VenueMeta VE VenueCard bunu okur.
    Kullanıcının diline göre biçimlenir (tr/nl ondalık virgül, en nokta). */
export function formatRating(rating: number): string {
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

/** Mekan meta satırı (★ puan · fiyat · semt) + adalet rozeti + seyahat çipleri — VenueRow/VenuePopCard ortak.
    `ratingCount` kasıtlı olarak YOK — hiçbir artboard'da yer almıyor (§4.9). */
export default function VenueMeta(props: { venue: VenueDto; travel: TravelInfo; midpointLabel?: string }) {
  const v = props.venue;
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  // Semt YALNIZ orta nokta etiketinden farklıysa (§4.9) — VenueCard'daki aynı kural (reviewer bulgusu).
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;
  const hasMeta = v.rating != null || hasPrice || !!locality;

  return (
    <>
      {hasMeta && (
        <span className="text-[0.75rem] text-ink2">
          {v.rating != null && <span>★ {formatRating(v.rating)}</span>}
          {v.rating != null && hasPrice && " · "}
          {hasPrice && <span>{"€".repeat(v.priceLevel!)}</span>}
          {(v.rating != null || hasPrice) && locality && " · "}
          {locality && <span>{locality}</span>}
        </span>
      )}
      <FairnessBadge venue={v} travel={props.travel} />
      <TravelChips venue={v} travel={props.travel} size="sm" />
    </>
  );
}
