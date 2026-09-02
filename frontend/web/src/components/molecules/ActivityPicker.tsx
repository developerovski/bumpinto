import { useTranslation } from "react-i18next";
import { ACTIVITY_GROUPS, ACTIVITY_ICONS, type ActivityGroup } from "../../lib/activity";
import { Overline } from "../atoms";

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[0.90625rem] font-semibold";

export default function ActivityPicker<A extends string>(props: { value: A; onChange: (a: A) => void; compact?: boolean; ariaLabel?: string }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className={`grid gap-x-5 gap-y-4 ${props.compact ? "" : "lg:grid-cols-2"}`}>
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <Overline>{t(`activity.group.${g}`)}</Overline>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_GROUPS[g].map((a) => {
              const I = ACTIVITY_ICONS[a];
              const on = a === props.value;
              return (
                <button key={a} type="button" role="radio" aria-checked={on} onClick={() => props.onChange(a as A)}
                  className={`${CHIP} ${on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"}`}>
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
