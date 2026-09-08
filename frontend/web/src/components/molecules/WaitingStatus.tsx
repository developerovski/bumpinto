/* Kaynak: artboard W5 · Bekle 1280 (1864-1883) sağ bölge kartı + Bekle 390 (1920-1923, 1960-1963).
   1280'de `.card` (padding 26/28/24, gap 14, ortalanmış); 390'da KART YOK — yalnız ortalanmış
   `col` (h2 19px + .cp), çünkü harita işareti zaten yukarıdaki `.f-mid` kartında (MidpointCard). */
import { Car, HandWaving } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import type { LocationState } from "../../store/useOwnLocation";
import type { TravelMode } from "../../lib/travelMode";
import { useSocialStore } from "../../store/socialStore";
import { Button, ErrorText, Note } from "../atoms";
import LocationField from "./LocationField";
import TravelModeField from "./TravelModeField";

/** Artboard W5 · sağ bölge kartı — "Mekanlar geliyor" + konum/ulaşım değiştir + dürtme.
    Kapalıyken iki küçük buton yan yana (artboard 1878-1881 / 1960-1963); açılınca aynı
    LocationField + TravelModeField ikilisi (JoinFormFields/NewSessionPage'le aynı desen) — konum
    sunucuya YENİDEN lat/lng ile gönderilir (`LocationRequest.lat/lng` zorunlu, yalnız `travelMode`
    değişse de). Dürtme artboard'da DAVETLİ görünümünde duruyor: kurana özel DEĞİL (uç nokta +
    60 sn soğuma `socialStore`'da, sunucu da uygular). */
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
  /** Dürtülebilecek kişiler (R-W6 kapısı çağıranda: çevrimdışı YA DA konumu gelmemiş). */
  nudgeTargets?: ParticipantDto[];
  slug?: string;
}) {
  const { t } = useTranslation();
  const nudge = useSocialStore((s) => s.nudge);
  const canNudge = useSocialStore((s) => s.canNudge);
  const targets = props.nudgeTargets ?? [];
  return (
    <div
      className={
        "flex flex-col items-center gap-3.5 text-center " +
        // Kart kabuğu YALNIZ ≥1024: 390 artboard'ında (1920-1923) bu blok kartsız akıyor.
        "lg:rounded-card lg:border lg:border-line lg:bg-card lg:p-[1.625rem_1.75rem_1.5rem] lg:shadow-sh1"
      }
    >
      <div className="flex flex-col items-center gap-1 lg:gap-1.5">
        {/* Artboard 390 başlığı 19px; ≥1024'te `.h2` (21px) — h2 atomunun lg ezmesi (24px) burada
            geçerli değil, artboard iki kırılımda da 21px'i geçmiyor. */}
        <h2 className="text-[1.1875rem] lg:text-h2">{t("waiting.preparing")}</h2>
        <p className="max-w-[34ch] text-center text-[0.8125rem] leading-normal text-ink2">
          {/* Kopya kırılıma göre değişir: 1280 "sekme", 390 "uygulama" (artboard 1876 / 1922). */}
          <span className="lg:hidden">{t("waiting.copyMobile")}</span>
          <span className="hidden lg:inline">{t("waiting.copy")}</span>
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
        /* Artboard: iki `.bsm` buton yan yana — 390'da `flex:1` ile eşit bölüşür, 1280'de içerik
           genişliğinde. `min-height:44px` artboard'ın inline ezmesi (dokunma hedefi); Button
           atomunun `sm` boyu 42px olduğu için satır düzeyinde ezilir. */
        <div className="mt-1.5 flex w-full flex-wrap gap-2 [&>button]:min-h-[2.75rem] [&>button]:flex-1 lg:w-auto lg:[&>button]:flex-none">
          <Button type="button" kind="white" size="sm" onClick={props.onToggle} disabled={props.busy}>
            <Car size={18} aria-hidden />
            {t("waiting.changeLocationAndMode")}
          </Button>
          {targets.map((p) => (
            <Button
              key={p.id}
              type="button"
              kind="white"
              size="sm"
              disabled={!canNudge(p.id!)}
              onClick={() => void nudge(props.slug ?? "", p.id!, p.displayName ?? "")}
            >
              <HandWaving size={18} aria-hidden />
              {t("presence.nudge", { name: p.displayName ?? "" })}
            </Button>
          ))}
        </div>
      )}
      {props.error && <ErrorText>{props.error}</ErrorText>}
    </div>
  );
}
