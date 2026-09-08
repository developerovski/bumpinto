/* Karar dokümanı §5.C "Karar v2" — ADALET / UYUM / YER. Veri olmayan eksen HİÇ çizilmez;
   yer tutucu metin yazılmaz (§1 bulgusu: artboard'lar olmayan veriye yaslanıyordu).
   Yerleşim artboard W8 `.f-why` (CSS 340): etiket ve değer AYNI satırda, `auto 1fr` ızgara —
   sol kenarlıklı yığın DEĞİL (rapor I · P2-4). 390'da kart yok, üstlük yok: blok doğrudan sayfa
   akışında (2637–2641); kart kabuğu yalnız ≥1024'te açılır (P2-B2). */
import { useTranslation } from "react-i18next";
import { fairnessOf, type SessionView as View, type VenueDto as Venue } from "@bumpinto/shared";
import { roundedMidpointMeters } from "../../lib/geo";
import { Overline } from "../atoms";
import FitLine from "./FitLine";

/* Değer hücresi — 390'da `.mi` (12px), 1280'de `.cp` (14px), her ikisinde de `--ink`. */
const VALUE = "text-[0.75rem] text-ink lg:text-[0.875rem]";

export default function WhyHere(props: {
  view: View;
  venue: Venue;
  labels: Record<string, string>;
}) {
  const { t } = useTranslation();
  // `fairnessOf` (frontend/shared) artık sunucu-yalnız yolu da kapsar (§4.1–4.2 — travel[]
  // boşken bile `venue.fairness` alanı varsa Fairness üretir; kod-review düzeltmesi: WhyHere'in
  // yerel `fairnessForAxis`i aynı düşümü ikinci kez yapıyordu, tek kaynağa katlandı).
  const f = fairnessOf(props.venue);
  // Yuvarlanmış metre WinnerCard'ın meta satırıyla AYNI kaynaktan (geo.roundedMidpointMeters).
  const rounded = roundedMidpointMeters(props.view.midpoint, props.venue);
  const longestName = f ? (props.labels[f.longestId] ?? "") : "";

  // YER ekseni (artboard 2562 / 2640): bugünün saatleri + 1280'de ADRES, 390'da MESAFE.
  // İkisi farklıysa iki sürüm de DOM'a girer, hangisinin görüneceğine ölçü karar verir; aynıysa
  // (ör. adres yok) tek düğüm basılır — aynı cümleyi iki kez yazmanın anlamı yok.
  const hours = props.venue.hoursToday ? t("venue.hoursToday", { hours: props.venue.hoursToday }) : null;
  const distance =
    rounded == null ? null : rounded < 100 ? t("result.midpointExact") : t("result.midpointMeters", { m: rounded });
  const placeWide = [hours, props.venue.address ?? distance].filter(Boolean).join(" · ");
  const placeNarrow = [hours, distance ?? props.venue.address].filter(Boolean).join(" · ");

  return (
    <div
      className={
        "flex flex-col gap-2.5 lg:rounded-card lg:border lg:border-line lg:bg-card " +
        "lg:p-[1.25rem_1.375rem] lg:shadow-sh1 lg:max-w-[32.5rem]"
      }
    >
      {/* 390'da başlık yok — üç etiketli satır kendini zaten anlatıyor (artboard 2637). */}
      <div className="hidden lg:block">
        <Overline>{t("result.whyTitle")}</Overline>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-[0.1875rem] lg:gap-x-[0.875rem] lg:gap-y-1.5">
        {f && (
          <>
            <Overline>{t("result.axisFair")}</Overline>
            <span className={VALUE}>
              {longestName
                ? t("result.fairLine", { min: f.min, max: f.max, name: longestName })
                : t("result.fairLineNoName", { min: f.min, max: f.max })}
            </span>
          </>
        )}

        {/* UYUM — B-7:T4 `category` gelmeden çizilmez. Sözcük/renk mantığı `FitLine`'da tek
            uygulama (reviewer notu) — `categories` geçilmez, tek mekan ekranında çeşitlilik
            denetimi (§4.6, "12 aynı kart") anlamsız. */}
        {/* Atıf da şart: `FitLine` atıfsız mekânda null döner, kapı yalnız `category`'ye baksaydı
            başlık çizilip altı boş kalırdı (Foursquare çoklu seçimde HER ZAMAN atıfsız döner). */}
        {props.venue.category && props.venue.activityType && (
          <>
            <Overline>{t("result.axisFit")}</Overline>
            <FitLine venue={props.venue} />
          </>
        )}

        {placeWide && (
          <>
            <Overline>{t("result.axisPlace")}</Overline>
            <span className={VALUE}>
              {placeNarrow === placeWide ? (
                placeWide
              ) : (
                <>
                  <span className="lg:hidden">{placeNarrow}</span>
                  <span className="hidden lg:inline">{placeWide}</span>
                </>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
