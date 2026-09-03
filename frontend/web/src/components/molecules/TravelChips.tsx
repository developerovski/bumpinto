/* Kaynak: karar dokümanı §4.3 — beş yüzeyde (satır, deste kartı, Beğendiklerin, finalist,
   kazanan) TEK seyahat bileşeni. Herkes görünür, en uzun önce, "Sen" kalın, "~" öneki,
   sonda "fark N dk", en uzunda ▲, RENK YOK. */
import { useTranslation } from "react-i18next";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { fairnessOf, type VenueDto as Venue } from "@bumpinto/shared";

const CHIP =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-sand " +
  "px-[0.6875rem] py-[0.28125rem] font-bold text-ink2";
// Artboard `.f-fark` (DS v2 §11) — dış "fark N dk" çipi: kesikli kenarlık, saydam zemin.
const FARK =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed " +
  "border-line2 bg-transparent px-[0.6875rem] py-[0.28125rem] font-bold text-ink2";
const SIZES = { md: "text-[0.75rem]", sm: "text-[0.6875rem]" };

export default function TravelChips(props: {
  venue: Venue;
  /** `useTravelLabels` çıktısı — labels/selfId TEK nesne, ayrı geçilirse ayrışabilir. */
  travel: TravelInfo;
  size?: keyof typeof SIZES;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f) return null;
  const chip = `${CHIP} ${SIZES[props.size ?? "md"]}`;
  const many = f.entries.length > 1;

  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 tabular-nums">
      {f.entries.map((e) => {
        const self = !!props.travel.selfId && e.id === props.travel.selfId;
        // Beraberlikte (fark 0 dk) kimse "en uzun" değildir — ▲ hiçbir çipte basılmaz (§4.3 tie polish).
        const longest = many && e.id === f.longestId && f.spread !== 0;
        return (
          <li key={e.id} className={chip}>
            <span className={self ? "font-extrabold text-ink" : undefined}>
              {props.travel.labels[e.id] ?? t("travel.friend")}
            </span>
            {t("travel.min", { min: e.minutes })}
            {longest && (
              <>
                <span aria-hidden className="text-ink3">
                  ▲
                </span>
                <span className="sr-only">{t("travel.longest")}</span>
              </>
            )}
          </li>
        );
      })}
      {many && (
        <li className={`${FARK} ${SIZES[props.size ?? "md"]}`}>{t("travel.gap", { min: f.spread })}</li>
      )}
    </ul>
  );
}
