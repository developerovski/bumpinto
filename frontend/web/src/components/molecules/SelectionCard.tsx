/* Artboard `Mekanlar bireysel 390` / `1280` — seçili satırın altındaki onay kartı.
   1280'de de AYNI kart kullanılır: satırdaki eski "Bunu seç" butonunun yerini alır.
   `compact` (haritadaki pop kart içi) yalnız Overline + butonlar basar — mekan adı ve
   seyahat çipleri zaten `VenueMeta` üzerinden pop kartta gösteriliyor (kod-review bulgusu:
   iki kez basılıyordu). */
import { useTranslation } from "react-i18next";
import type { VenueDto as Venue } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Button, Overline } from "../atoms";
import TravelChips from "./TravelChips";

export default function SelectionCard(props: {
  venue: Venue;
  /** `useTravelLabels` çıktısı — labels/selfId TEK nesne (bkz. TravelChips/FairnessBadge). */
  travel: TravelInfo;
  compact?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[1.125rem] border-[1.5px] border-flame-deep bg-flame-wash ${
        props.compact ? "p-3" : "mt-1.5 p-3.5"
      }`}
    >
      <Overline tone="flame">{t("venues.selectionTitle")}</Overline>
      {!props.compact && (
        <>
          <span className="text-[0.9375rem] font-bold">{props.venue.name}</span>
          <TravelChips venue={props.venue} travel={props.travel} size="sm" />
        </>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" size="fit" onClick={props.onConfirm}>
          {t("venues.lockIn")}
        </Button>
        <Button type="button" kind="white" size="fit" onClick={props.onCancel}>
          {t("venues.cancel")}
        </Button>
      </div>
    </div>
  );
}
