import { useTranslation } from "react-i18next";
import type { LocationChange } from "../../store/useLocationChange";
import { Button, Note } from "../atoms";
import LocationField from "./LocationField";
import TravelModeField from "./TravelModeField";

/** Oturum başladıktan SONRA konum/ulaşım düzenleme formu — Bekle ekranının kartı ve Lobi'nin
    host satırı AYNI bloğu basar. Blok tek yerde: lobiye kopyalansaydı iki yüzeyde farklı
    doğrulama ve farklı hata cümleleri oluşurdu. */
export default function LocationForm({ change, inputId }: { change: LocationChange; inputId: string }) {
  const { t } = useTranslation();
  const loc = change.loc;
  return (
    <div className="flex w-full flex-col gap-3.5 text-left">
      <Note>{t("waiting.modeHint")}</Note>
      <LocationField
        title={t("join.whereLabel")}
        state={loc.state}
        label={loc.coords?.label ?? null}
        address={loc.address}
        onAddressChange={loc.setAddress}
        onUseLocation={loc.detect}
        onOtherAddress={loc.otherAddress}
        inputId={inputId}
        busy={loc.busy}
      />
      <TravelModeField value={change.travelMode} onChange={change.setTravelMode} />
      <div className="flex gap-2">
        <Button type="button" onClick={() => void change.submit()} disabled={change.busy || !change.canSubmit}>
          {t("common.save")}
        </Button>
        <Button type="button" kind="white" onClick={change.toggle} disabled={change.busy}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
