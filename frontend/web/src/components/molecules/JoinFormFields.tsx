/* Kaynak: ui.css .field(gap:15) / .label / .a-dot / .a-dv-text(→ c-dv-text) / .err / .muted */
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, Note, TextInput } from "../atoms";
import Field from "./Field";

/** Artboard W1 · katılım formu — ad + konum seçimi + gizlilik notu. */
export default function JoinFormFields(props: {
  name: string;
  address: string;
  /** Konum alındıysa etiketi; yoksa buton "Mevcut konumumu kullan" der. */
  locationLabel: string | null;
  error: string | null;
  busy: boolean;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
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
        <Button type="button" kind="white" align="start" onClick={props.onUseLocation}>
          <span
            className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-grass-wash"
            aria-hidden
          >
            <i className="block h-[0.5625rem] w-[0.5625rem] rounded-full bg-grass" />
          </span>
          {props.locationLabel ?? t("join.useMyLocation")}
        </Button>
        <div className="c-dv-text">{t("join.or")}</div>
        <TextInput
          id="join-address"
          aria-label={t("join.addressAria")}
          placeholder={t("join.addressPlaceholder")}
          value={props.address}
          onChange={(e) => props.onAddressChange(e.target.value)}
        />
      </div>
      {props.error && <ErrorText>{props.error}</ErrorText>}
      <Button type="submit" disabled={props.busy || !props.name.trim()}>
        {t("join.submit")}
      </Button>
      <Note center>{t("join.privacy")}</Note>
    </form>
  );
}
