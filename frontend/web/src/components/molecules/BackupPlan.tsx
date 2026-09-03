/* Karar dokümanı §5.C — "Yedek plan": runoff ikincisi (voteTally), yoksa likeCounts ikincisi
   (≥2 beğeni ve ≥3 katılımcı şartıyla). İkisi de yoksa satır hiç çizilmez. Sayı eşitliğinde
   `venue.id` sözlük sırasına göre kararlı bir kazanan seçilir — herkes AYNI ikincil mekanı
   görür (code-review düzeltmesi: önceden `Array.sort` kararsız kalabiliyordu). */
import { useTranslation } from "react-i18next";
import type { SessionView as View } from "@bumpinto/shared";
import { backupOf } from "../../lib/backupPlan";
import { Note, Overline } from "../atoms";
import VenueThumb from "./VenueThumb";

export default function BackupPlan(props: { view: View; winnerId: string; tint: number }) {
  const { t } = useTranslation();
  const v = backupOf(props.view, props.winnerId);
  if (!v) return null;
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-sh1">
      <VenueThumb venue={v} tint={props.tint} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Overline>{t("result.backup")}</Overline>
        <span className="text-[0.875rem] font-bold">{v.name}</span>
      </div>
      <Note>{t("result.backupNote")}</Note>
    </div>
  );
}
