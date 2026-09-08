/* Kaynak: artboard W7 Runoff 1280 (2374-2376) / 390 (2451-2453) ve W7b Berabere 390
   (4356-4358) / 1280 (4421-4423).
   T4: "Son düzlük" çıkartması KALDIRILDI (karar dokümanı §4.8 — kutlama/rozet dili yasak);
   overline + başlık dalı (2 finalist / 3+) + neden kopyası (INTERSECTION/FALLBACK, B-7:T2) yeterli. */
import { useTranslation } from "react-i18next";
import { activityListLabel } from "../../lib/activity";
import { Overline } from "../atoms";

export default function RunoffIntro(props: {
  activities: string[];
  people: number;
  finalists: number;
  reason?: "INTERSECTION" | "FALLBACK";
  /** Kendi seçimini kilitledi mi — kilitliyken başlık artboard Runoff 1280/390 "kilitli" dalına döner. */
  sent: boolean;
  /** Beraberlik: "Berabere" sayfanın MANŞETİDİR (artboard 4357/4422), sağ kolondaki amber
      kartın 14px'lik etiketi değil. Overline/başlık/kopya birlikte W7b dalına döner. */
  tie?: boolean;
  /** Beraberlikte kararı kimin verdiği kopyaya girer — host'a "sen", diğerlerine host'un adı. */
  host?: boolean;
  hostName?: string;
}) {
  const { t, i18n } = useTranslation();
  // Locale duyarlı büyütme (review bulgusu — sabit "tr" en/nl'de "I" → "İ" bozulmasına yol
  // açardı; ActivityStrip.tsx ile AYNI desen).
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const copyKey = props.tie
    ? props.host
      ? "runoff.tieHostCopy"
      : "runoff.tieGuestCopy"
    : props.sent
      ? "runoff.copySent"
      : props.reason === "FALLBACK"
        ? "runoff.copyFallback"
        : "runoff.copy";
  // YALNIZ varsayılan kopyanın 1280 karşılığı ayrı bir cümledir (artboard 2375 mobilden daha
  // kısa yazıyor: "İkisini de herkes beğendi — tek seçim hakkın var."). Diğer dallarda iki
  // kırılma noktası aynı metni paylaşır, o yüzden ikinci düğüm hiç basılmaz.
  const wide = copyKey === "runoff.copy";
  return (
    <div className="flex flex-col items-start gap-1">
      <Overline>
        {props.tie
          ? t("runoff.tieOverline")
          : t("runoff.overline", {
              activity: activityListLabel(props.activities, t, locale).toLocaleUpperCase(locale),
              count: props.people,
            })}
      </Overline>
      {/* h1 ölçüsü artboard'dan: 390'da 26px (beraberlikte 30px), 1280'de 40px + (-6px) üst
          marj — negatif marj YALNIZ geniş kırılmada, 390'da başlık overline'a yapışmasın. */}
      <h1 className={`${props.tie ? "text-[1.875rem]" : "text-[1.625rem]"} lg:-mt-1.5 lg:text-[2.5rem]`}>
        {props.tie
          ? t("runoff.tieTitle")
          : props.sent
            ? t("runoff.titleSent")
            : props.finalists <= 2
              ? t("runoff.titleTwo")
              : t("runoff.titleMany")}
      </h1>
      {/* `.bd m2` (2375): 1280'de 16px ve en fazla 48ch — uzun satır okunmuyordu. 390'da `.cp`
          (13px) kalır. `Note` atomu max-width/kırılma noktası taşımadığı için burada düz <p>. */}
      <p className="max-w-[48ch] text-[0.8125rem] leading-normal text-ink2 lg:text-base">
        <span className={wide ? "lg:hidden" : undefined}>
          {t(copyKey, { host: props.hostName ?? "" })}
        </span>
        {wide && <span className="hidden lg:inline">{t("runoff.copyWide")}</span>}
      </p>
    </div>
  );
}
