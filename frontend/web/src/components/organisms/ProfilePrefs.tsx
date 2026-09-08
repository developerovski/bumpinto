import { CaretDown, Car, Check, Coffee, Globe, MapPin } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import { Button, ErrorText } from "../atoms";
import { ACTIVITY_ICONS, groupOf } from "../../lib/activity";
import { DEFAULT_TRAVEL_MODE, MODE_ICON, MODE_LABEL_KEY, type TravelMode } from "../../lib/travelMode";
import { LANGUAGES } from "../../lib/languages";
import ActivityPicker from "../molecules/ActivityPicker";
import LocationField from "../molecules/LocationField";
import PrefRow from "../molecules/PrefRow";
import TravelModeField from "../molecules/TravelModeField";
import { useOwnLocation } from "../../store/useOwnLocation";

/* Dil artık açılır panel değil (kartın hep açık bej ayağı) — bu yüzden listede yok. */
type Panel = "location" | "activity" | "travelMode" | null;

/** Artboard W9 · Profil tercihler kartı — konum, etkinlik, ulaşım ve dil düzenlenebilir açılır
    panelli. `defaultTravelMode` yalnız Katıl formunu İSTEMCİ tarafında ön-doldurur (backend
    okumaz) — PUT /api/me tam değişim yaptığından `onTravelMode` diğer alanları korur. */
export default function ProfilePrefs({
  me,
  onLanguage,
  onLocation,
  onActivity,
  onTravelMode,
}: {
  me: MeResponse;
  onLanguage: (code: string) => Promise<void>;
  onLocation: (loc: { lat: number; lng: number; label?: string }) => Promise<void>;
  onActivity: (a: string) => Promise<void>;
  onTravelMode: (mode: TravelMode) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  /* Dil bloğu HEP açık olduğundan hatası ayrı tutulur: ortak `error` burada gösterilseydi
     etkinlik/ulaşım panelindeki hata dil ayağında da tekrar ederdi. */
  const [langError, setLangError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const activity = me.defaultActivity;
  const Icon = activity ? ACTIVITY_ICONS[activity] : undefined;
  // 390 ikon karoları (2792-2814): artboard seçili tercihin kendi glifini gösterir; hiç seçim
  // yoksa artboard'ın varsayılan glifleri (ph-coffee / ph-car) kalır.
  const TravelIcon = me.defaultTravelMode ? MODE_ICON[me.defaultTravelMode][0] : Car;
  const currentCode = me.language ?? i18n.resolvedLanguage;
  const currentLang = LANGUAGES.find((l) => l.code === currentCode)?.label ?? "";
  const loc = useOwnLocation({
    initial: me.defaultLocation
      ? { lat: me.defaultLocation.lat, lng: me.defaultLocation.lng, label: me.defaultLocation.label ?? null }
      : null,
  });

  function toggle(panel: Exclude<Panel, null>) {
    setError(null);
    setOpen((o) => (o === panel ? null : panel));
  }

  // Tek render noktası: hata yalnız o an açık olan panelin içinde gösterilir.
  const errorNode = error ? <ErrorText>{error}</ErrorText> : null;

  async function saveLocation() {
    setError(null);
    setSaving(true);
    try {
      const c = await loc.resolve();
      if (!c) {
        setError(t("join.errGeocode"));
        return;
      }
      await onLocation({ lat: c.lat, lng: c.lng, label: c.label ?? undefined });
      setOpen(null);
    } catch {
      setError(t("profile.errSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
      <PrefRow
        label={t("profile.defaultLocation")}
        icon={<MapPin />}
        value={me.defaultLocation?.label ?? null}
        open={open === "location"}
        onToggle={() => toggle("location")}
      >
        <div className="mx-[1.125rem] mb-3.5 flex flex-col gap-3">
          <LocationField
            title={t("profile.defaultLocation")}
            state={loc.state}
            label={loc.coords?.label ?? null}
            address={loc.address}
            onAddressChange={loc.setAddress}
            onUseLocation={loc.detect}
            onOtherAddress={loc.otherAddress}
            busy={loc.busy}
          />
          <Button
            kind="white"
            size="fit"
            disabled={saving || (!loc.coords && !loc.address.trim())}
            onClick={() => void saveLocation()}
          >
            {t("common.save")}
          </Button>
          {open === "location" && errorNode}
        </div>
      </PrefRow>
      <div className="mx-[1.125rem] h-px bg-line" />
      <PrefRow
        label={t("profile.defaultActivity")}
        icon={Icon ? <Icon /> : <Coffee />}
        value={
          activity ? (
            <>
              {t(`activity.${activity}`)}
              {/* Artboard 2718'de (1280) alt satır "Kahve · Yeme-içme", 390'da (2799) yalnız
                  "Kahve" — dar satırda grup adı etiketi kırıyordu. */}
              <span className="hidden lg:inline"> · {t(`activity.group.${groupOf(activity)}`)}</span>
            </>
          ) : null
        }
        aside={
          activity && Icon ? (
            // Artboard 2722 `.chip.on`: min-height 36, yatay dolgu 12, 13px.
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border-[1.5px] border-flame-deep bg-flame-wash px-3 text-[0.8125rem] font-semibold text-flame-deep">
              <Icon size={18} aria-hidden />
              {t(`activity.${activity}`)}
            </span>
          ) : undefined
        }
        open={open === "activity"}
        onToggle={() => toggle("activity")}
      >
        <div className="mx-[1.125rem] mb-3.5 flex flex-col gap-3">
          <ActivityPicker
            compact
            max={1}
            value={me.defaultActivity ? [me.defaultActivity] : []}
            onToggle={(a) => void onActivity(a).catch(() => setError(t("profile.errSave")))}
            ariaLabel={t("profile.defaultActivity")}
          />
          {open === "activity" && errorNode}
        </div>
      </PrefRow>
      <div className="mx-[1.125rem] h-px bg-line" />
      <PrefRow
        label={t("profile.defaultTravelMode")}
        icon={<TravelIcon />}
        value={me.defaultTravelMode ? t(MODE_LABEL_KEY[me.defaultTravelMode].name) : null}
        aside={
          me.defaultTravelMode ? (
            // Artboard 2731 `.f-mode`: ÇIPLAK 12px ink2 glif — dolu chip değil. Etiket zaten
            // satırın alt yazısında ("Arabayla"); chip onu tekrar ediyordu.
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-ink2" aria-hidden>
              {MODE_ICON[me.defaultTravelMode].map((I, i) => (
                <I key={i} size={16} />
              ))}
            </span>
          ) : undefined
        }
        open={open === "travelMode"}
        onToggle={() => toggle("travelMode")}
      >
        <div className="mx-[1.125rem] mb-3.5 flex flex-col gap-3">
          <TravelModeField
            value={me.defaultTravelMode ?? DEFAULT_TRAVEL_MODE}
            onChange={(mode) => void onTravelMode(mode).catch(() => setError(t("profile.errSave")))}
            label={t("profile.defaultTravelMode")}
          />
          {open === "travelMode" && errorNode}
        </div>
      </PrefRow>
      <div className="mx-[1.125rem] h-px bg-line" />
      {/* Dil bloğu PrefRow DEĞİL: artboard 2735-2747'de kartın BEJ ayağı olarak HEP AÇIK durur
          (radius 0 0 22px 22px, caret AŞAĞI bakar) — seçenekler `.pop-r` satırları, seçili olan
          flame-wash zeminde ph-check ile işaretli. Açılır panele gerek yok, üç seçenek zaten
          görünüyor. Radyo girdileri sr-only: erişilebilir ad etiketin metninden gelir. */}
      <div className="flex flex-col gap-3 rounded-b-card bg-[#fbf5ec] px-[1.125rem] py-3.5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[0.625rem] bg-sand text-[1.0625rem] text-ink2 lg:hidden"
            aria-hidden
          >
            <Globe />
          </span>
          <span className="flex flex-1 flex-col items-start gap-0.5 text-left">
            <span className="text-[0.875rem] font-bold">{t("profile.language")}</span>
            <span className="text-[0.75rem] text-ink2">{`${currentLang} · ${t("profile.languageNote")}`}</span>
          </span>
          <CaretDown size={16} className="flex-none text-ink3" aria-hidden />
        </div>
        <div
          role="radiogroup"
          aria-label={t("profile.language")}
          className="flex flex-col gap-0.5 rounded-[0.875rem] border border-line bg-white p-1.5"
        >
          {LANGUAGES.map((l) => {
            const checked = currentCode === l.code;
            return (
              <label
                key={l.code}
                className={`flex cursor-pointer items-center justify-between rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold focus-within:outline-[2.5px] focus-within:outline-flame-deep focus-within:outline-offset-2 ${
                  checked ? "bg-flame-wash text-flame-deep" : "text-ink"
                }`}
              >
                <span>{l.label}</span>
                <input
                  type="radio"
                  name="lang"
                  value={l.code}
                  checked={checked}
                  onChange={() => {
                    setLangError(null);
                    void onLanguage(l.code).catch(() => setLangError(t("profile.errSave")));
                  }}
                  className="sr-only"
                />
                {checked && <Check size={16} aria-hidden />}
              </label>
            );
          })}
        </div>
        {langError && <ErrorText>{langError}</ErrorText>}
      </div>
    </div>
  );
}
