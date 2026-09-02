/* Kaynak: ui.css .field(gap:15) / .label / .a-dot / .a-dv-text(→ c-dv-text) / .loc(.on) / .err / .muted */
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, TextInput } from "../atoms";
import Field from "./Field";

const LOC_DOT = (
  <span
    className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-grass-wash"
    aria-hidden
  >
    <i className="block h-[0.5625rem] w-[0.5625rem] rounded-full bg-grass" />
  </span>
);

/** Artboard W1 · katılım formu — ad + konum seçimi (otomatik/adres) + gizlilik notu. */
export default function JoinFormFields(props: {
  name: string;
  address: string;
  locationState: "idle" | "granted" | "denied";
  locationLabel: string | null;
  error: string | null;
  busy: boolean;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
  onOtherAddress: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <form onSubmit={props.onSubmit} className="flex flex-col gap-[0.9375rem]">
      <Field
        id="join-name"
        label={t("join.nameLabel")}
        value={props.name}
        onChange={(e) => props.onNameChange(e.target.value)}
        placeholder={t("join.namePlaceholder")}
        autoComplete="name"
      />
      <div className="flex flex-col gap-2">
        <span className="text-[0.875rem] font-semibold">{t("join.whereLabel")}</span>

        {props.locationState === "granted" && (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem]">
              <span className="c-check" aria-hidden>
                <i />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.875rem] font-bold">{t("join.locAuto")}</span>
                <span className="text-[0.8125rem] text-ink2">
                  {props.locationLabel
                    ? t("join.locAutoHint", { label: props.locationLabel })
                    : t("join.locAutoHintNoLabel")}
                </span>
              </div>
              <Badge tone="grass">{t("join.locOk")}</Badge>
            </div>
            <button
              type="button"
              onClick={props.onOtherAddress}
              className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
            >
              {t("join.locOther")}
            </button>
          </>
        )}

        {props.locationState === "denied" && (
          <>
            <Button type="button" kind="white" align="start" onClick={props.onUseLocation}>
              {LOC_DOT}
              {t("join.locRetry")}
            </Button>
            <ErrorText>{t("join.errGeolocation")}</ErrorText>
            <TextInput
              id="join-address"
              aria-label={t("join.addressAria")}
              placeholder={t("join.addressPlaceholder")}
              value={props.address}
              onChange={(e) => props.onAddressChange(e.target.value)}
              autoFocus
            />
          </>
        )}

        {props.locationState === "idle" && (
          <>
            <Button type="button" kind="white" align="start" onClick={props.onUseLocation}>
              {LOC_DOT}
              {t("join.useMyLocation")}
            </Button>
            <div className="c-dv-text">{t("join.or")}</div>
            <TextInput
              id="join-address"
              aria-label={t("join.addressAria")}
              placeholder={t("join.addressPlaceholder")}
              value={props.address}
              onChange={(e) => props.onAddressChange(e.target.value)}
            />
          </>
        )}
      </div>
      {props.error && <ErrorText>{props.error}</ErrorText>}
      <Button type="submit" disabled={props.busy || !props.name.trim()}>
        {t("join.submit")}
      </Button>
      <Note center>{t("join.privacy")}</Note>
    </form>
  );
}
