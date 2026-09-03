/* Kaynak: DS v2 §11 `.f-steps` — 4 adımlı ilerleme (Lobi/Bekle). `StepList` Landing'e özel
   (3 adım, `landing.step1..3`'e bağlı) — burada yeniden kullanılmaz, ayrı bileşen. */
import { useTranslation } from "react-i18next";

const STEPS = ["locations", "venues", "vote", "decide"] as const;

export default function SessionSteps(props: { current: (typeof STEPS)[number] }) {
  const { t } = useTranslation();
  const at = STEPS.indexOf(props.current);
  return (
    <ol aria-label={t("steps.aria")} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === at ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] font-head text-[0.6875rem] font-extrabold ${
              i <= at ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 text-ink3"
            }`}
          >
            {i + 1}
          </span>
          <span className={`text-[0.75rem] font-semibold ${i <= at ? "text-ink" : "text-ink3"}`}>
            {t(`steps.${s}`)}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-line2" />}
        </li>
      ))}
    </ol>
  );
}
