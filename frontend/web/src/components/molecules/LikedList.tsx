/* Kaynak: artboard Deste bitti 1280 sağ kart "Beğendiklerin" */
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { byFairness } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Overline } from "../atoms";
import FairnessBadge from "./FairnessBadge";
import TravelChips from "./TravelChips";
import { formatRating } from "./VenueMeta";
import VenueThumb from "./VenueThumb";

export default function LikedList(props: {
  venues: VenueDto[];
  liked: Record<string, boolean>;
  travel?: TravelInfo;
}) {
  const { t } = useTranslation();
  // Minimax sıra (§4.9) — en adil (en kısa en-uzun-yol) önce, VenueBrowser'la aynı sıralayıcı.
  const liked = props.venues.filter((v) => props.liked[v.id!]).sort(byFairness);
  const travel = props.travel ?? { labels: {} };

  return (
    <div className="rounded-card border border-line bg-card py-1 shadow-sh1">
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <Overline>{t("deck.liked")}</Overline>
        <span className="text-[0.75rem] text-ink2 tabular-nums">
          {t("deck.likedN", { count: liked.length })}
        </span>
      </div>
      {liked.map((v, i) => (
        <div key={v.id}>
          {i > 0 && <div className="mx-4 h-px bg-line" />}
          <div className="flex items-center gap-3 px-4 py-[0.8125rem]">
            {/* VenueCard photoOnly yüksekliği %100'dür (deste yığını için); yüksekliği
                olmayan bir satırda 0px'e çökerdi — küçük görselin doğru bileşeni bu. */}
            <VenueThumb venue={v} tint={0} size={48} />
            <div className="flex flex-1 flex-col gap-0.5">
              <h3>{v.name}</h3>
              {v.rating != null && (
                <span className="text-[0.75rem] text-ink2">★ {formatRating(v.rating)}</span>
              )}
              <FairnessBadge venue={v} travel={travel} />
              <TravelChips venue={v} travel={travel} size="sm" />
            </div>
            <span
              className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-[image:var(--grad)] text-white"
              aria-hidden
            >
              <Check size={14} />
            </span>
          </div>
        </div>
      ))}
      {liked.length > 0 && <div className="mx-4 h-px bg-line" />}
      <div className="px-4 py-3 text-[0.75rem] text-ink2">{t("deck.likedNote")}</div>
    </div>
  );
}
