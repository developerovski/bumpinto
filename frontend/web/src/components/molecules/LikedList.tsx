/* Kaynak: artboard Deste bitti 1280 sağ kart "Beğendiklerin" (2050-2075 / 2216-2266) */
import { Check } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { byFairness, fairnessOf } from "@bumpinto/shared";
import { formatRating } from "../../lib/format";
import { fairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Badge, Overline } from "../atoms";
import { CHECK_ON } from "./checkStyles";
import FitLine from "./FitLine";
import RangeBar from "./RangeBar";
import VenueThumb from "./VenueThumb";

export default function LikedList(props: {
  venues: VenueDto[];
  liked: Record<string, boolean>;
  travel?: TravelInfo;
  /** Destedeki TÜM kategoriler — `FitLine`'ın "12 aynı kart" çeşitlilik denetimine geçer (§4.6). */
  categories?: string[];
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
      {liked.map((v, i) => {
        const hasPrice = v.priceLevel != null && v.priceLevel > 0;
        const f = fairnessOf(v);
        const line = f ? fairnessLine(f, travel, t) : null;
        return (
          <div key={v.id}>
            {i > 0 && <div className="mx-4 h-px bg-line" />}
            {/* Artboard `.f-lk` (372-373): gap 11px, padding 11px 16px, üstten hizalı; gövde gap 5px. */}
            <div className="flex items-start gap-[0.6875rem] px-4 py-[0.6875rem]">
              {/* VenueCard photoOnly yüksekliği %100'dür (deste yığını için); yüksekliği
                  olmayan bir satırda 0px'e çökerdi — küçük görselin doğru bileşeni bu. */}
              <VenueThumb venue={v} tint={0} size={44} />
              <div className="flex min-w-0 flex-1 flex-col gap-[0.3125rem]">
                <h3>{v.name}</h3>
                <FitLine venue={v} categories={props.categories ?? []} />
                {/* Artboard 2053: "★ 4.4 · €" — puan ve fiyat TEK satırda. */}
                {(v.rating != null || hasPrice) && (
                  <span className="text-[0.75rem] text-ink2 tabular-nums">
                    {v.rating != null && `★ ${formatRating(v.rating, v.ratingScale)}`}
                    {v.rating != null && hasPrice && " · "}
                    {hasPrice && "€".repeat(v.priceLevel!)}
                  </span>
                )}
                {/* Artboard 2054/2067: adalet rozeti `.rg` bandının ÜSTÜNDE, sola yaslı. `.rg-g`
                    alt satırı burada lead'i TEKRAR EDER (artboard da öyle yapıyor) — dar satırda
                    rozet göz taraması, alt satır ise sayıyı taşır. */}
                {line?.lead && (
                  <span className="self-start">
                    <Badge tone={line.leadTone === "amber" ? "amber" : "grass"}>{line.lead}</Badge>
                  </span>
                )}
                <RangeBar venue={v} travel={travel} />
              </div>
              <span className={CHECK_ON} aria-hidden>
                <Check size={14} />
              </span>
            </div>
          </div>
        );
      })}
      {/* Artboard 390 (Deste bitti 3413) bu notu GÖSTERMEZ — kart son satırda kapanır; 1280'de
          (2074) var. Bilgi mobilde başlıktaki "· N beğeni" ile zaten veriliyor. Ayraç da notla
          birlikte düşer, yoksa mobilde kartın dibinde sahipsiz bir çizgi kalırdı. */}
      {liked.length > 0 && <div className="mx-4 hidden h-px bg-line lg:block" />}
      <div className="hidden px-4 py-3 text-[0.75rem] text-ink2 lg:block">{t("deck.likedNote")}</div>
    </div>
  );
}
