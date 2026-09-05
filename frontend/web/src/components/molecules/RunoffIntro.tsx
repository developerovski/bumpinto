/* Kaynak: RunoffScreen .top bloğu — .col(gap:4;align-items:flex-start) + h1(29px;margin-top:6).
   T4: "Son düzlük" çıkartması KALDIRILDI (karar dokümanı §4.8 — kutlama/rozet dili yasak);
   overline + başlık dalı (2 finalist / 3+) + neden kopyası (INTERSECTION/FALLBACK, B-7:T2) yeterli. */
import { useTranslation } from "react-i18next";
import { activityListLabel } from "../../lib/activity";
import { Note, Overline } from "../atoms";

export default function RunoffIntro(props: {
  activities: string[];
  people: number;
  finalists: number;
  reason?: "INTERSECTION" | "FALLBACK";
  /** Kendi seçimini kilitledi mi — kilitliyken başlık artboard Runoff 1280/390 "kilitli" dalına döner. */
  sent: boolean;
}) {
  const { t, i18n } = useTranslation();
  // Locale duyarlı büyütme (review bulgusu — sabit "tr" en/nl'de "I" → "İ" bozulmasına yol
  // açardı; ActivityStrip.tsx ile AYNI desen).
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  return (
    <div className="flex flex-col items-start gap-1">
      <Overline>
        {t("runoff.overline", {
          activity: activityListLabel(props.activities, t, locale).toLocaleUpperCase(locale),
          count: props.people,
        })}
      </Overline>
      <h1 className="mt-1.5 text-[1.8125rem]">
        {props.sent
          ? t("runoff.titleSent")
          : props.finalists <= 2
            ? t("runoff.titleTwo")
            : t("runoff.titleMany")}
      </h1>
      <Note>{props.reason === "FALLBACK" ? t("runoff.copyFallback") : t("runoff.copy")}</Note>
    </div>
  );
}
