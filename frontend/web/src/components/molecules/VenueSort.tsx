/* Karar dokümanı §4.5 / §5.B.1 — liste sırası: "Herkese adil" (varsayılan) · "Puan".
   Sıralama saf fonksiyondan gelir (`@bumpinto/shared` byFairness/byRating) — burada
   yeniden uygulanmaz. */
import { useTranslation } from "react-i18next";
import Segmented from "./Segmented";

export type SortKey = "fair" | "rating";

export default function VenueSort(props: { value: SortKey; onChange: (v: SortKey) => void }) {
  const { t } = useTranslation();
  return (
    <Segmented
      value={props.value}
      onChange={props.onChange}
      ariaLabel={t("venues.sort")}
      options={[
        { value: "fair" as const, label: t("venues.sortFair") },
        { value: "rating" as const, label: t("venues.sortRating") },
      ]}
    />
  );
}
