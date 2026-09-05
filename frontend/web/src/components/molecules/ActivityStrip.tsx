/* "Kahve, Doğa yürüyüşü ve Bar için buluşuyoruz" + vaat satırı (karar dokümanı §5.C).
   i18n ANAHTARLARI DEĞİŞMEDİ: `{{activity}}` artık `Intl.ListFormat` ile birleştirilmiş
   çoklu etiket alıyor — üç dilin bağlacı da doğru çıkıyor. */
import { useTranslation } from "react-i18next";
import { ACTIVITY_ICONS, activityListLabel } from "../../lib/activity";

export default function ActivityStrip(props: { activities: string[]; km?: number | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  if (props.activities.length === 0) return null;
  // İkon: ilk alanınki — şerit tek satır, rozet listesi zaten yukarıda duruyor.
  const I = ACTIVITY_ICONS[props.activities[0]];
  const label = activityListLabel(props.activities, t, locale);
  const lower = label.toLocaleLowerCase(locale);
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-flame-wash px-4 py-3">
      {I && <I size={20} className="text-flame-deep" aria-hidden />}
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold">{t("lobby.meetingFor", { activity: label })}</span>
        <span className="text-[0.75rem] text-ink2">
          {props.km != null
            ? t("lobby.promiseKm", { activity: lower, km: props.km })
            : t("lobby.promise", { activity: lower })}
        </span>
      </div>
    </div>
  );
}
