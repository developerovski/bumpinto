/**
 * Etkinlik listesini okunabilir tek satıra çevirir ("Kahve, Yemek ve Sinema").
 *
 * ADI OLMAYAN oturumun başlığı buradan gelir: artboard P1'de kart HER ZAMAN başlıklıdır,
 * boş bırakmak satırı hizasız ve kimliksiz bırakıyor.
 *
 * `Intl.ListFormat` Hermes'in her sürümünde YOKTUR; yoksa artboard'ın nokta ayracına düşülür.
 */
export function activityListLabel(
  activities: readonly string[],
  t: (key: string) => string,
  locale: string,
): string {
  const labels = activities.map((a) => t(`activity.${a}`));
  const ListFormat = (Intl as { ListFormat?: typeof Intl.ListFormat }).ListFormat;
  if (!ListFormat) return labels.join(" · ");
  return new ListFormat(locale, { style: "long", type: "conjunction" }).format(labels);
}
