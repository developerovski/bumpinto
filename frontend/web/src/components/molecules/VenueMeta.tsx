import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { Badge } from "../atoms";

/** Mekan meta satırı (★ puan · fiyat) + seyahat rozetleri — VenueRow/VenuePopCard ortak. */
export default function VenueMeta(props: { venue: VenueDto; travelLabels: Record<string, string> }) {
  const { t } = useTranslation();
  const v = props.venue;
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const hasMeta = v.rating != null || hasPrice;
  const travel = Object.entries(v.travelMinutes ?? {});

  return (
    <>
      {hasMeta && (
        <span className="text-[0.75rem] text-ink2">
          {v.rating != null && `★ ${v.rating.toFixed(1)}`}
          {v.rating != null && hasPrice && " · "}
          {hasPrice && "€".repeat(v.priceLevel!)}
        </span>
      )}
      {travel.length > 0 && (
        <div className="flex flex-wrap items-center gap-[0.3125rem] tabular-nums">
          {travel.map(([who, min]) => (
            <Badge key={who} size="sm">
              {t("deck.travelShort", { who: props.travelLabels[who] ?? t("deck.travelFallback"), min })}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
