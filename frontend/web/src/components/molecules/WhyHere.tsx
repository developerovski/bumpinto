/* Karar dokümanı §5.C "Karar v2" — ADALET / UYUM / YER. Veri olmayan eksen HİÇ çizilmez;
   yer tutucu metin yazılmaz (§1 bulgusu: artboard'lar olmayan veriye yaslanıyordu). */
import { useTranslation } from "react-i18next";
import { fairnessOf, type SessionView as View, type VenueDto as Venue } from "@bumpinto/shared";
import { roundedMidpointMeters } from "../../lib/geo";
import { HandNote, Note, Overline } from "../atoms";
import FitLine from "./FitLine";

const AXIS = "flex flex-col gap-0.5 border-l-2 border-line pl-3";

export default function WhyHere(props: {
  view: View;
  venue: Venue;
  labels: Record<string, string>;
}) {
  const { t } = useTranslation();
  // `fairnessOf` (frontend/shared) artık sunucu-yalnız yolu da kapsar (§4.1–4.2 — travelMinutes
  // boşken bile `venue.fairness` alanı varsa Fairness üretir; kod-review düzeltmesi: WhyHere'in
  // yerel `fairnessForAxis`i aynı düşümü ikinci kez yapıyordu, tek kaynağa katlandı).
  const f = fairnessOf(props.venue);
  // Yuvarlanmış metre WinnerCard'ın meta satırıyla AYNI kaynaktan (geo.roundedMidpointMeters) —
  // burada yalnız adres YOKKEN yedek olarak gösterilir (artboard'ın `.f-why` Yer satırı sade
  // adres; mesafe artboard'da `.mi` meta satırında — coordinator düzeltmesi, çift satır yok).
  const rounded = roundedMidpointMeters(props.view.midpoint, props.venue);
  const longestName = f ? (props.labels[f.longestId] ?? "") : "";

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.25rem_1.375rem] shadow-sh1">
      <Overline>{t("result.whyTitle")}</Overline>

      {f && (
        <div className={AXIS}>
          <Overline>{t("result.axisFair")}</Overline>
          <span className="text-[0.875rem]">
            {longestName
              ? t("result.fairLine", { min: f.min, max: f.max, name: longestName })
              : t("result.fairLineNoName", { min: f.min, max: f.max })}
          </span>
        </div>
      )}

      {/* UYUM — B-7:T4 `category` gelmeden çizilmez. Sözcük/renk mantığı `FitLine`'da tek
          uygulama (reviewer notu) — `categories` geçilmez, tek mekan ekranında çeşitlilik
          denetimi (§4.6, "12 aynı kart") anlamsız. */}
      {/* Atıf da şart: `FitLine` atıfsız mekânda null döner, kapı yalnız `category`'ye baksaydı
          başlık çizilip altı boş kalırdı (Foursquare çoklu seçimde HER ZAMAN atıfsız döner). */}
      {props.venue.category && props.venue.activityType && (
        <div className={AXIS}>
          <Overline>{t("result.axisFit")}</Overline>
          <FitLine venue={props.venue} />
        </div>
      )}

      {/* YER — adres B-7:T4 varsa TEK kaynak (mesafe WinnerCard'ın meta satırında zaten var,
          burada tekrar edilmez — coordinator düzeltmesi). Adres yoksa mesafe yedek olarak kalır. */}
      {(props.venue.address || rounded != null) && (
        <div className={AXIS}>
          <Overline>{t("result.axisPlace")}</Overline>
          {props.venue.address ? (
            <span className="text-[0.875rem]">{props.venue.address}</span>
          ) : (
            rounded != null && (
              <Note>
                {rounded < 100 ? t("result.midpointExact") : t("result.midpointMeters", { m: rounded })}
              </Note>
            )
          )}
        </div>
      )}

      {/* Tek HandNote — yalnız fark ≥ 10 dk VE adlandırılabilir bir kişi varken (isim yoksa
          "{{name}} en uzaktan geliyor" boş öznesiyle basılmaz). */}
      {f && f.spread >= 10 && longestName && (
        <HandNote>{t("result.leaveEarlyHand", { name: longestName, min: f.spread })}</HandNote>
      )}
    </div>
  );
}
