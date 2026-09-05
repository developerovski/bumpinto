import { useTranslation } from "react-i18next";
import { ACTIVITY_GROUPS, ACTIVITY_ICONS, MAX_ACTIVITIES, type ActivityGroup } from "../../lib/activity";
import { Overline } from "../atoms";

const CHIP = "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[0.90625rem] font-semibold";

export default function ActivityPicker<A extends string>(props: {
  value: A[];
  onToggle: (a: A) => void;
  /** Tekil seçim için 1 (Profil varsayılanı); varsayılan MAX_ACTIVITIES. */
  max?: number;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const max = props.max ?? MAX_ACTIVITIES;
  const single = max === 1;
  // Tekil seçimde rol de tekil olmalı: "checkbox" ekran okuyucuya birden fazla
  // secilebilecegini soyler, oysa tiklamak DEGISTIRIR.
  const groupRole = single ? "radiogroup" : "group";
  const itemRole = single ? "radio" : "checkbox";
  const full = props.value.length >= max;
  return (
    <div role={groupRole} aria-label={props.ariaLabel} className={`grid gap-x-5 gap-y-4 ${props.compact ? "" : "lg:grid-cols-2"}`}>
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <Overline>{t(`activity.group.${g}`)}</Overline>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_GROUPS[g].map((a) => {
              const I = ACTIVITY_ICONS[a];
              const on = props.value.includes(a as A);
              // Sınırdayken SEÇİLİ chip açık kalır: kapatılsaydı kullanıcı seçimini
              // geri alamaz, ekran kilitlenirdi. Tekil modda hiçbir chip kilitlenmez.
              const locked = !single && full && !on;
              return (
                <button key={a} type="button" role={itemRole} aria-checked={on} disabled={locked}
                  onClick={() => props.onToggle(a as A)}
                  className={`${CHIP} ${locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"}`}>
                  <I size={18} aria-hidden />{t(`activity.${a}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
