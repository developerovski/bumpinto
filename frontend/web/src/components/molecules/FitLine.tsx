/* Karar dokümanı §4.6 — "uyum satırı", DS v2 §11 `.f-fit`. Tek uygulama: VenueCard (deste/liste)
   VE WhyHere'in UYUM ekseni bunu çağırır — sözcük/renk mantığı tek yerde yaşar.
   Aktivite MEKÂNIN KENDİ alanıdır (B-9 `VenueDto.activityType`): karışık destede oturumun
   ilk alanına bakmak her hike kartına "kahve değil" yazdırırdı. */
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { fitsActivity } from "../../lib/activity";

export default function FitLine(props: {
  venue: VenueDto;
  /** Destedeki TÜM kategoriler — ≥2 farklı değer yoksa satır gizlenir (§4.6, "12 aynı kart").
      Geçilmezse (ör. Karar ekranında tek mekan) çeşitlilik denetimi atlanır. */
  categories?: string[];
}) {
  const { t, i18n } = useTranslation();
  const c = props.venue.category;
  const a = props.venue.activityType;
  // Atıf çözülemediyse SUS: uydurma bir alan adı yanlış bilgidir.
  if (!c || !a) return null;
  if (props.categories && new Set(props.categories.filter(Boolean)).size < 2) return null;
  const ok = fitsActivity(a, c);
  const activity = t(`activity.${a}`);
  // Locale duyarlı küçültme (review bulgusu — sabit "tr" en/nl'de "I" → "ı" bozulmasına yol
  // açardı; ActivityStrip.tsx ile AYNI desen).
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  return (
    <span className={`text-[0.8125rem] ${ok ? "text-ink2" : "font-semibold text-amber"}`}>
      {ok
        ? t("venue.fitOk", { activity, category: c.toLocaleLowerCase(locale) })
        : t("venue.fitOff", { activity, category: c.toLocaleLowerCase(locale) })}
    </span>
  );
}
