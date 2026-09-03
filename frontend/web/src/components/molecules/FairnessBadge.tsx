/* Kaynak: karar dokümanı §4.2 — TEK rozet, TEK kural. Meta satırında Badge olarak durur;
   fotoğrafın üstünde ASLA, Sticker ASLA. Ad ek almaz (tr/en/nl güvenli). */
import { useTranslation } from "react-i18next";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { SAME_FOR_ALL, fairnessOf, type VenueDto as Venue } from "@bumpinto/shared";
import { Badge } from "../atoms";

export default function FairnessBadge(props: {
  venue: Venue;
  /** `useTravelLabels` çıktısı — labels/selfId TEK nesne, ayrı geçilirse ayrışabilir. */
  travel: TravelInfo;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length < 2) return null;
  if (f.spread <= SAME_FOR_ALL) return <Badge tone="grass">{t("fairness.same")}</Badge>;
  if (!f.outlierId) return null;
  return (
    <Badge tone="neutral">
      {f.outlierId === props.travel.selfId
        ? t("fairness.farSelf")
        : t("fairness.far", { name: props.travel.labels[f.outlierId] ?? t("travel.friend") })}
    </Badge>
  );
}
