/* Karar dokümanı §2 (politika) + §5.B.9 — sağlayıcı atfı. Google içeriğinin yanında
   "Google Maps" metni, FSQ verisi olan ekranda "Powered by Foursquare" zorunlu.
   `provider` (B-7:T4) gelene kadar HER İKİ metin alt alta basılır; alan gelince tek satır. */
import { useTranslation } from "react-i18next";

/** Sağlayıcı birleşimi (§4.9, §5.B.9) — TÜM mekanların TEK bilinen sağlayıcısı varsa onu döner;
    herhangi bir mekanın sağlayıcısı EKSİKSE ya da karışıksa `undefined` (politika: ikisi de basılır,
    "bilinmiyor" tek sağlayıcı sayılmaz — reviewer bulgusu). */
export function unionProvider(venues: { provider?: string }[]): string | undefined {
  if (venues.length === 0) return undefined;
  const providers = new Set(venues.map((v) => v.provider).filter((p): p is string => !!p));
  return providers.size === 1 && venues.every((v) => !!v.provider) ? [...providers][0] : undefined;
}

export default function Attribution(props: { provider?: string; center?: boolean }) {
  const { t } = useTranslation();
  const cls = `flex flex-col gap-0.5 text-[0.6875rem] text-ink3 ${props.center ? "text-center" : ""}`;
  if (props.provider === "GOOGLE") return <p className={cls}>{t("attribution.google")}</p>;
  if (props.provider === "FOURSQUARE") return <p className={cls}>{t("attribution.foursquare")}</p>;
  // B-7:T4 öncesi: hangi sağlayıcı olduğunu bilmiyoruz, ikisini de yazmak politikaya uygundur.
  return (
    <p className={cls}>
      <span>{t("attribution.google")}</span>
      <span>{t("attribution.foursquare")}</span>
    </p>
  );
}
