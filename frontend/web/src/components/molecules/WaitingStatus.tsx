/* Kaynak: artboard Bekle 1280/390 sağ kart — .card(align:center;gap:14;padding:22px 20px) */
import { Car } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { LocationState } from "../../store/useOwnLocation";
import type { TravelMode } from "../../lib/travelMode";
import { Button, ErrorText, Note } from "../atoms";
import LocationField from "./LocationField";
import MapMark from "./MapMark";
import TravelModeField from "./TravelModeField";

/** Artboard W2 · sağ bölge kartı — harita işareti + "Mekanlar geliyor" (rev-2 Bekle kopyası,
    plan16 T3 K-W3) + konum/ulaşım değiştir. Kapalıyken tek buton; açılınca aynı LocationField +
    TravelModeField ikilisi (JoinFormFields/NewSessionPage'le aynı desen) — konum sunucuya YENİDEN
    lat/lng ile gönderilir (`LocationRequest.lat/lng` zorunlu, yalnız `travelMode` değişse de). */
export default function WaitingStatus(props: {
  open: boolean;
  onToggle: () => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
  locationState: LocationState;
  locationLabel: string | null;
  address: string;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
  onOtherAddress: () => void;
  locationBusy?: boolean;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  canSubmit: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-line bg-card p-[1.375rem_1.25rem] text-center shadow-sh1">
      <div className="lg:hidden">
        <MapMark />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h2>{t("waiting.preparing")}</h2>
        <p className="max-w-[34ch] text-center text-[0.8125rem] leading-normal text-ink2">
          {t("waiting.copy")}
        </p>
      </div>
      {props.open ? (
        <div className="flex w-full flex-col gap-3.5 text-left">
          <Note>{t("waiting.modeHint")}</Note>
          <LocationField
            title={t("join.whereLabel")}
            state={props.locationState}
            label={props.locationLabel}
            address={props.address}
            onAddressChange={props.onAddressChange}
            onUseLocation={props.onUseLocation}
            onOtherAddress={props.onOtherAddress}
            inputId="waiting-address"
            busy={props.locationBusy}
          />
          <TravelModeField value={props.travelMode} onChange={props.onTravelModeChange} />
          <div className="flex gap-2">
            <Button type="button" onClick={props.onSubmit} disabled={props.busy || !props.canSubmit}>
              {t("common.save")}
            </Button>
            <Button type="button" kind="white" onClick={props.onToggle} disabled={props.busy}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" kind="white" onClick={props.onToggle} disabled={props.busy}>
          <Car size={18} aria-hidden />
          {t("waiting.changeLocationAndMode")}
        </Button>
      )}
      {props.error && <ErrorText>{props.error}</ErrorText>}
    </div>
  );
}
