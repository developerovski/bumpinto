/* Kaynak: DS v2 §11 `.f-steps` (v3 CSS 321–323) — 4 adımlı ilerleme (Lobi/Bekle). Numara YOK:
   şerit "Kimler var" bloğunun içinde, ilerleme çubuğunun ALTINDA duran düz bir metin dizisi
   (12px/500 ink2; içinde bulunulan adım 700 ink). `StepList` Landing'e özel (3 adım,
   `landing.step1..3`'e bağlı) — burada yeniden kullanılmaz, ayrı bileşen. */
import { useTranslation } from "react-i18next";

const STEPS = ["locations", "venues", "vote", "decide"] as const;

export default function SessionSteps(props: { current: (typeof STEPS)[number] }) {
  const { t } = useTranslation();
  const at = STEPS.indexOf(props.current);
  return (
    <ol
      aria-label={t("steps.aria")}
      className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[0.75rem] font-medium text-ink2"
    >
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === at ? "step" : undefined} className="flex items-center gap-1.5">
          {/* Geçilmiş adımlar da ink: "nerede olduğumuz" yalnız kalınlıkla ayrılır (artboard'da
              tek örnek var — ilk adım — ikisi de aynı görünürdü). */}
          <span className={i === at ? "font-bold text-ink" : i < at ? "text-ink" : ""}>
            {t(`steps.${s}`)}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-3 bg-line2" />}
        </li>
      ))}
    </ol>
  );
}
