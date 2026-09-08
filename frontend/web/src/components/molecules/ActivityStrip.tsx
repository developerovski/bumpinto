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
    // Artboard `.f-act` (v3 CSS 339-340, W3 1076-1082 / W5 1821-1827): KART DEĞİL — zemin, kenar
    // ve gölge yok. Kart olarak basılınca hemen altındaki davet kartıyla aynı flame-wash zemini
    // iki kutu hâlinde üst üste geliyordu. İkon 22px flame-deep, başlık `.h3` (17px başlık fontu).
    <div className="flex items-start gap-[0.6875rem]">
      {I && <I size={22} className="flex-none text-flame-deep" aria-hidden />}
      <div className="flex flex-col gap-0.5">
        <h3>{t("lobby.meetingFor", { activity: label })}</h3>
        <span className="text-[0.75rem] text-ink2">
          {props.km != null
            ? t("lobby.promiseKm", { activity: lower, km: props.km })
            : t("lobby.promise", { activity: lower })}
        </span>
      </div>
    </div>
  );
}
