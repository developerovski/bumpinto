import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import { Button, ErrorText } from "../atoms";
import { ACTIVITY_ICONS, groupOf } from "../../lib/activity";
import { DEFAULT_TRAVEL_MODE, MODE_ICON, MODE_LABEL_KEY, type TravelMode } from "../../lib/travelMode";
import { LANGUAGES } from "../molecules/LangMenu";
import ActivityPicker from "../molecules/ActivityPicker";
import LocationField from "../molecules/LocationField";
import PrefRow from "../molecules/PrefRow";
import TravelModeField from "../molecules/TravelModeField";
import { useOwnLocation } from "../../store/useOwnLocation";

type Panel = "location" | "activity" | "language" | "travelMode" | null;

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
  const [saving, setSaving] = useState(false);
  const activity = me.defaultActivity;
  const Icon = activity ? ACTIVITY_ICONS[activity] : undefined;
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
        value={activity ? `${t(`activity.${activity}`)} · ${t(`activity.group.${groupOf(activity)}`)}` : null}
        aside={
          activity && Icon ? (
            <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-flame-deep bg-flame-wash px-3 py-1.5 text-[0.875rem] font-semibold text-flame-deep">
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
            value={me.defaultActivity ?? ""}
            onChange={(a) => void onActivity(a).catch(() => setError(t("profile.errSave")))}
            ariaLabel={t("profile.defaultActivity")}
          />
          {open === "activity" && errorNode}
        </div>
      </PrefRow>
      <div className="mx-[1.125rem] h-px bg-line" />
      <PrefRow
        label={t("profile.defaultTravelMode")}
        value={me.defaultTravelMode ? t(MODE_LABEL_KEY[me.defaultTravelMode].name) : null}
        aside={
          me.defaultTravelMode ? (
            <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-flame-deep bg-flame-wash px-3 py-1.5 text-[0.875rem] font-semibold text-flame-deep">
              {MODE_ICON[me.defaultTravelMode].map((I, i) => (
                <I key={i} size={18} aria-hidden />
              ))}
              {t(MODE_LABEL_KEY[me.defaultTravelMode].name)}
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
      <PrefRow
        label={t("profile.language")}
        value={`${currentLang} · ${t("profile.languageNote")}`}
        open={open === "language"}
        onToggle={() => toggle("language")}
      >
        <div
          role="radiogroup"
          aria-label={t("profile.language")}
          className="mx-[1.125rem] mb-3.5 flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-1.5"
        >
          {LANGUAGES.map((l) => {
            const checked = currentCode === l.code;
            return (
              <label
                key={l.code}
                className={`flex cursor-pointer items-center justify-between rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold ${
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
                    setError(null);
                    void onLanguage(l.code).catch(() => setError(t("profile.errSave")));
                  }}
                  className="accent-flame-deep"
                />
              </label>
            );
          })}
        </div>
        {open === "language" && <div className="mx-[1.125rem] mb-3.5">{errorNode}</div>}
      </PrefRow>
    </div>
  );
}
