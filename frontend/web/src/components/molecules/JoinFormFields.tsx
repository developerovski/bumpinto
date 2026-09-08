/* Kaynak: ui.css .field(gap:15) / .label / .err / .muted / .cta(col gap:9) — artboard Katıl 1280/390 + W4b */
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TravelMode } from "../../lib/travelMode";
import { Button, ErrorText, Note } from "../atoms";
import Field from "./Field";
import LocationField from "./LocationField";
import TravelModeField from "./TravelModeField";

/** Hatanın KİMLİĞİ, metni değil — artboard her birini başka yere koyuyor: adres hatası alanın
    altında (1391), 409 "çok uzak" CTA'nın üstünde bir kart içinde (4164), genel katılım hatası
    Katıl düğmesinin ALTINDA ve ortalanmış (1395–1397). */
export type JoinErrorKind = "geocode" | "tooFar" | "join";
export type JoinError = { kind: JoinErrorKind; message: string };

/** Artboard W1 · katılım formu — ad + konum seçimi (otomatik/adres) + ulaşım türü + gizlilik notu. */
export default function JoinFormFields(props: {
  name: string;
  address: string;
  locationState: "idle" | "granted" | "denied";
  locationLabel: string | null;
  locationBusy?: boolean;
  travelMode: TravelMode;
  error: JoinError | null;
  busy: boolean;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
  onOtherAddress: () => void;
  onTravelModeChange: (mode: TravelMode) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    // 460px: artboard 1275/1276/1280/1292/1302 — ayracın ALTINDAKİ her blok 58fr bölgesi
    // içinde bu genişlikte kapanır (giriş bloğu ve başlık tam genişlikte kalır).
    <form onSubmit={props.onSubmit} className="flex flex-col gap-[0.9375rem] lg:max-w-[28.75rem]">
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
      <TravelModeField value={props.travelMode} onChange={props.onTravelModeChange} />
      {/* Adres alanına bağlı hata alanın hemen altında kalır (artboard 1391–1393). */}
      {props.error?.kind === "geocode" && <ErrorText>{props.error.message}</ErrorText>}
      {/* Artboard `.cta col` (1302 / 4164 / 4245): 9px aralık, üstte 4px pay. */}
      <div className="mt-1 flex flex-col gap-[0.5625rem]">
        {props.error?.kind === "tooFar" && (
          // Artboard 4164–4170 / 4212–4224: flame-wash zeminli, #F6C6D2 kenarlıklı kart.
          // 390'da iç boşluk 10/13px, 1280'de 12/14px.
          <div className="flex flex-col gap-1.5 rounded-card border border-[#f6c6d2] bg-flame-wash p-[0.625rem_0.8125rem] shadow-sh1 lg:p-[0.75rem_0.875rem]">
            <ErrorText>{props.error.message}</ErrorText>
            {/* Artboard'daki "Buluşma yeri: … · sen ~1.900 km" satırı ile "Host'a yaz" düğmesi
                BİLEREK yok: 409 gövdesi `ApiError { error }`, `SessionPreview` de orta nokta
                etiketi/uzaklık taşımıyor — sunucu 409'a `midpointLabel` + `distanceKm` ekleyene
                kadar bu cümle uydurulamaz. Düğmenin de gideceği bir yer yok (host'a mesaj
                yeteneği katılım ÖNCESİ mevcut değil). */}
          </div>
        )}
        <Button type="submit" disabled={props.busy || !props.name.trim()}>
          {t("join.submit")}
        </Button>
        {/* Artboard 1395–1397: genel katılım hatası düğmenin ALTINDA ve ortalanmış. */}
        {props.error?.kind === "join" && (
          <div className="text-center">
            <ErrorText>{props.error.message}</ErrorText>
          </div>
        )}
        <Note center>{t("join.privacy")}</Note>
      </div>
    </form>
  );
}
