/* Karar dokümanı §5.C — sunucu-kapılı oy sayımı: yalnız RunoffStatus'ta `voteTally` doluyken
   (herkes kilitleyince ya da DECIDED'da, B-7:T2) mount edilir. Sayı 320ms'de count-up yapar,
   reduced-motion'da anında görünür (useCountUp). */
import { useTranslation } from "react-i18next";
import type { VenueDto as Venue } from "@bumpinto/shared";
import { useCountUp } from "../../lib/useCountUp";
import { Overline } from "../atoms";

function TallyRow(props: { name: string; count: number }) {
  const value = useCountUp(props.count);
  return (
    <div role="listitem" className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[0.875rem] font-semibold">{props.name}</span>
      <span className="font-head text-[1.125rem] font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

export default function VoteTally(props: { tally: Record<string, number>; finalists: Venue[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <Overline>{t("runoff.tallyTitle")}</Overline>
      <div role="list" aria-label={t("runoff.tallyTitle")} className="flex flex-col">
        {props.finalists.map((v) => (
          <TallyRow key={v.id} name={v.name ?? ""} count={props.tally[v.id ?? ""] ?? 0} />
        ))}
      </div>
    </div>
  );
}
