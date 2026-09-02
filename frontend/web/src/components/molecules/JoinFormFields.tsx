/* Kaynak: ui.css .field(gap:15) / .label / .err / .muted */
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, Note } from "../atoms";
import Field from "./Field";
import LocationField from "./LocationField";

/** Artboard W1 · katılım formu — ad + konum seçimi (otomatik/adres) + gizlilik notu. */
export default function JoinFormFields(props: {
  name: string;
  address: string;
  locationState: "idle" | "granted" | "denied";
  locationLabel: string | null;
  locationBusy?: boolean;
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
      <LocationField
        title={t("join.whereLabel")}
        state={props.locationState}
        label={props.locationLabel}
        address={props.address}
        onAddressChange={props.onAddressChange}
        onUseLocation={props.onUseLocation}
        onOtherAddress={props.onOtherAddress}
        inputId="join-address"
        busy={props.locationBusy}
      />
      {props.error && <ErrorText>{props.error}</ErrorText>}
      <Button type="submit" disabled={props.busy || !props.name.trim()}>
        {t("join.submit")}
      </Button>
      <Note center>{t("join.privacy")}</Note>
    </form>
  );
}
