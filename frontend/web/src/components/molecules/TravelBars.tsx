/* Artboard `.tb` (W6 deste kartı, W8 karar sağ kartı) — kişi başı yol çubuğu. Dar liste
   satırında DEĞİL (orada `RangeBar`): burada yatay yer var, herkes ayrı satır. */
import { useTranslation } from "react-i18next";
import { fairnessOf, type FairnessVenue } from "@bumpinto/shared";
import { fairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Overline } from "../atoms";
import { FairnessNote } from "./RangeBar";

const ROW = "grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-[0.78125rem] text-ink2";

export default function TravelBars(props: {
  venue: FairnessVenue;
  travel: TravelInfo;
  /** Kart içinde üstlük (ör. "Herkesin yolu"); deste kartında verilmez. */
  title?: string;
  /** Adalet baş cümlesi ("Herkese ~aynı") kartın başlık satırında rozet olarak basıldıysa (artboard
      2013) alt satır onu TEKRAR ETMEZ — yalnız olgu kalır (2023: "fark 10 dk · en uzun yol Kerem").
      Aynı hesabın (`fairnessLine`) iki sunumu; ikinci bir kural değil. */
  hideLead?: boolean;
  /** Adalet satırının tamamı. Artboard 2580-2584'te Karar ekranının `.tb` kartı YALNIZ üç çubuk
      satırı taşır — adalet cümlesi orada değil, imza kartının `.rc-ft` altbilgisindedir; iki
      yüzey birden basınca aynı cümle ekranda iki kez görünüyordu (rapor I · P3-7). */
  note?: boolean;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length === 0) return null;
  // Kendi satırın en üstte; kalanlar `fairnessOf` sırasında (en uzun yol önce) — kararlı.
  const rows = [...f.entries].sort(
    (a, b) => Number(b.id === props.travel.selfId) - Number(a.id === props.travel.selfId),
  );
  const full = fairnessLine(f, props.travel, t);
  const line = props.hideLead ? { ...full, lead: null, leadTone: null } : full;

  return (
    <div className="flex flex-col gap-1.5">
      {props.title && <Overline>{props.title}</Overline>}
      <ul className="m-0 flex list-none flex-col gap-[0.3125rem] p-0">
        {rows.map((e) => (
          <li key={e.id} className={ROW}>
            <b className="truncate font-bold text-ink">{props.travel.labels[e.id] ?? t("travel.friend")}</b>
            {/* `.tb-b` rayı `--color-track` (#efe7dc), `line2` DEĞİL (artboard CSS 432). */}
            <span className="relative h-2 overflow-hidden rounded-full bg-track">
              <i
                data-testid={`travel-fill-${e.id}`}
                className={`absolute inset-y-0 left-0 rounded-full ${e.id === f.longestId ? "bg-flame" : "bg-grass"}`}
                style={{ width: `${Math.max(8, Math.round((e.minutes / (f.max || e.minutes)) * 88))}%` }}
              />
            </span>
            <span className="text-right font-bold text-ink tabular-nums">
              {t("travel.min", { min: e.minutes })}
            </span>
          </li>
        ))}
      </ul>
      {props.note !== false && <FairnessNote line={line} />}
    </div>
  );
}
