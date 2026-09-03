/* "Kahve için buluşuyoruz" + vaat satırı (karar dokümanı §5.C "Lobi/Bekle").
   Vaat satırında etkinlik adı CÜMLE ORTASI — büyük harfle başlamaz; `toLocaleLowerCase` locale
   duyarlı (tr'de İ/I sorunu olmadan) küçültür (review bulgusu — sabit `.lower` anahtarları
   `activity.<KEY>` dizesini nesneye çevirip her yerdeki `t('activity.'+x)` çağrısını kırardı). */
import { useTranslation } from "react-i18next";
import { ACTIVITY_ICONS } from "../../lib/activity";

export default function ActivityStrip(props: { activity: string; km?: number | null }) {
  const { t, i18n } = useTranslation();
  const I = ACTIVITY_ICONS[props.activity];
  const label = t(`activity.${props.activity}`);
  const lower = label.toLocaleLowerCase(i18n.resolvedLanguage ?? i18n.language);
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
