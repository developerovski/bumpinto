/* Kaynak: artboard Landing 1280/390 sağ kolon — 3 adımlı "nasıl çalışır" */
import { useTranslation } from "react-i18next";

const NUM = "flex h-7 w-7 flex-none items-center justify-center rounded-full border-[1.5px] border-ink bg-sun font-head text-[0.8125rem] font-extrabold";

export default function StepList() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-start gap-3">
          <b className={NUM}>{n}</b>
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.875rem] font-semibold">{t(`landing.step${n}`)}</span>
            <span className="text-[0.75rem] text-ink2">{t(`landing.step${n}Copy`)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
