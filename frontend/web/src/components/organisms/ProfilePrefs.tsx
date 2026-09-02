import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeResponse } from "@bumpinto/shared";
import { ErrorText } from "../atoms";
import { ACTIVITY_ICONS, groupOf } from "../../lib/activity";
import { LANGUAGES } from "../molecules/LangMenu";
import PrefRow from "../molecules/PrefRow";

/** Artboard W9 · Profil tercihler kartı — konum/etkinlik salt bilgi (W-4 düzenler), Dil açılır panel. */
export default function ProfilePrefs({ me, onLanguage }: { me: MeResponse; onLanguage: (code: string) => Promise<void> }) {
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activity = me.defaultActivity;
  const Icon = activity ? ACTIVITY_ICONS[activity] : undefined;
  const currentCode = me.language ?? i18n.resolvedLanguage;
  const currentLang = LANGUAGES.find((l) => l.code === currentCode)?.label ?? "";

  return (
    <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
      <PrefRow label={t("profile.defaultLocation")} value={me.defaultLocation?.label ?? null} />
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
      />
      <div className="mx-[1.125rem] h-px bg-line" />
      <PrefRow
        label={t("profile.language")}
        value={`${currentLang} · ${t("profile.languageNote")}`}
        open={langOpen}
        onToggle={() => setLangOpen((o) => !o)}
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
        {error && (
          <div className="mx-[1.125rem] mb-3.5">
            <ErrorText>{error}</ErrorText>
          </div>
        )}
      </PrefRow>
    </div>
  );
}
