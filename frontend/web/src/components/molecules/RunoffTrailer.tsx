/* Karar dokümanı §5.B.7 + artboard 2389/2405 (`.f-trail`) — finalist kartının İÇİNDE, gövdenin
   son satırı: "toplam ~N dk · fark ~N dk", 12px/500, sola yaslı, ink2.
   Karar verici hücre YALNIZ fark değerini vurgular (`.f-win` amber-wash + 6px yarıçap): iki
   finalist arasında ≥5 dk fark ya da ≥0.3★ varsa. Eskiden satırın TAMAMI amber ve kalındı —
   artboard'da sadece "fark ~10 dk" parçası boyanıyor.
   Saf mantık + eşikler `../../lib/runoffTrailer`'da (Fast Refresh). */
import { Trans, useTranslation } from "react-i18next";
import { fairnessOf, type VenueDto as Venue } from "@bumpinto/shared";
import { isDeciding } from "../../lib/runoffTrailer";

export default function RunoffTrailer(props: { venue: Venue; all: Venue[] }) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f) return null;
  const deciding = isDeciding(props.venue, props.all);
  return (
    <p
      data-testid={`trailer-${props.venue.id}`}
      className="text-[0.75rem] leading-[1.4] font-medium text-ink2 tabular-nums"
    >
      {/* Vurgu satırın YALNIZ bir parçasına düştüğü için metin `<0>` ile i18n'den bölünür;
          `t()` ile tek parça alınsaydı etiket literal basılırdı. */}
      <Trans
        t={t}
        i18nKey="runoff.trailer"
        values={{ total: f.total, gap: f.spread }}
        components={[
          <span
            key="0"
            data-testid={`trailer-gap-${props.venue.id}`}
            className={deciding ? "rounded-md bg-amber-wash px-[0.3125rem] text-amber-ink" : ""}
          />,
        ]}
      />
    </p>
  );
}
