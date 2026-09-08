/* Artboard `Mekanlar bireysel 390` `.f-selcard` — seçili satırın altındaki onay kartı.
   1280'de satırın kendisinde "Bunu seç" düğmesi var (bkz. `VenueRow`) ve onay harita pop
   kartında sürüyor; bu yüzden satır-içi kart `lg`de gizlenir (bkz. `VenueBrowser`).
   `compact` (haritadaki pop kart içi) yalnız Overline + butonlar basar — mekan adı ve
   yol çubuğu (`RangeBar`) zaten `VenueMeta` üzerinden pop kartta gösteriliyor (kod-review
   bulgusu: iki kez basılıyordu). */
import { useTranslation } from "react-i18next";
import type { VenueDto as Venue } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Button, Overline } from "../atoms";
import RangeBar from "./RangeBar";

export default function SelectionCard(props: {
  venue: Venue;
  /** `useTravelLabels` çıktısı — labels/selfId TEK nesne (bkz. RangeBar/TravelBars). */
  travel: TravelInfo;
  compact?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      // `.f-selcard`: BEYAZ zemin + flame kenarlık + `--sh2` yükseklik (eskiden flame-wash pembe
      // zemin, gölgesiz — tonlu bir şerit gibi okunuyordu), 16px köşe, 12px dolgu, yanlardan 6px.
      className={`flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-flame-deep bg-card p-3 shadow-sh2 ${
        props.compact ? "" : "mx-1.5 mt-1.5"
      }`}
    >
      <Overline tone="flame">{t("venues.selectionTitle")}</Overline>
      {!props.compact && (
        <>
          <span className="text-[0.9375rem] font-bold">{props.venue.name}</span>
          <RangeBar venue={props.venue} travel={props.travel} />
        </>
      )}
      <div className="flex items-center gap-2">
        {/* `Kilitle` artboard'da `flex:1` — `Button` `className` almadığı için oran sarmalayıcıda. */}
        <div className="flex-1">
          <Button type="button" size="md" onClick={props.onConfirm}>
            {t("venues.lockIn")}
          </Button>
        </div>
        <Button type="button" kind="ghost" size="sm" onClick={props.onCancel}>
          {t("venues.cancel")}
        </Button>
      </div>
    </div>
  );
}
