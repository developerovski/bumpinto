/* Kaynak: ui.css .field(gap:15) / .label / .a-dot / .a-dv-text(→ c-dv-text) / .loc(.on) / .err — JoinFormFields'ten çıkarıldı */
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, TextInput } from "../atoms";

const LOC_DOT = (
  <span
    className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-grass-wash"
    aria-hidden
  >
    <i className="block h-[0.5625rem] w-[0.5625rem] rounded-full bg-grass" />
  </span>
);

/** Konum bloğu — otomatik alınan/adres yazılan konum; W1 katılım formu ve W2 yeni oturum ortak kullanır. */
export default function LocationField(props: {
  title: string;
  state: "idle" | "granted" | "denied";
  label: string | null;
  address: string;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
  onOtherAddress: () => void;
  otherLabel?: string;
  inputId?: string;
  busy?: boolean;
  /** Verilirse "haritadan seç" düğmesi çıkar. Harita AÇILINCA mount edilir — faturalanan
      birim `new google.maps.Map()` ve 390'da katılım ekranı bugün hiç harita mount etmiyor. */
  onPickOnMap?: () => void;
}) {
  const { t } = useTranslation();
  const inputId = props.inputId ?? "location-address";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.875rem] font-semibold">{props.title}</span>

      {props.state === "granted" && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem]">
            <span className="c-check" aria-hidden>
              <i />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[0.875rem] font-bold">{t("join.locAuto")}</span>
              <span className="text-[0.8125rem] text-ink2">
                {props.label ? t("join.locAutoHint", { label: props.label }) : t("join.locAutoHintNoLabel")}
              </span>
            </div>
            <Badge tone="grass">{t("join.locOk")}</Badge>
          </div>
          <button
            type="button"
            onClick={props.onOtherAddress}
            className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
          >
            {props.otherLabel ?? t("join.locOther")}
          </button>
        </>
      )}

      {props.state === "denied" && (
        <>
          <Button type="button" kind="white" align="start" onClick={props.onUseLocation} disabled={props.busy}>
            {LOC_DOT}
            {t("join.locRetry")}
          </Button>
          <ErrorText>{t("join.errGeolocation")}</ErrorText>
          <TextInput
            id={inputId}
            aria-label={t("join.addressAria")}
            placeholder={t("join.addressPlaceholder")}
            value={props.address}
            onChange={(e) => props.onAddressChange(e.target.value)}
            autoFocus
          />
          {props.onPickOnMap && (
            <button
              type="button"
              onClick={props.onPickOnMap}
              className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
            >
              {t("map.pickOnMap")}
            </button>
          )}
        </>
      )}

      {props.state === "idle" && (
        <>
          <Button type="button" kind="white" align="start" onClick={props.onUseLocation} disabled={props.busy}>
            {LOC_DOT}
            {t("join.useMyLocation")}
          </Button>
          <div className="c-dv-text">{t("join.or")}</div>
          <TextInput
            id={inputId}
            aria-label={t("join.addressAria")}
            placeholder={t("join.addressPlaceholder")}
            value={props.address}
            onChange={(e) => props.onAddressChange(e.target.value)}
          />
          {props.onPickOnMap && (
            <button
              type="button"
              onClick={props.onPickOnMap}
              className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
            >
              {t("map.pickOnMap")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
