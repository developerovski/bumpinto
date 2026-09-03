/* Karar dokümanı §5.B.7 — finalist kartının ALTINDA tek satır: toplam ~N dk · fark ~N dk.
   Karar verici hücre amber-wash: iki finalist arasında ≥5 dk fark ya da ≥0.3★ varsa.
   Saf mantık + eşikler `../../lib/runoffTrailer`'da (Fast Refresh). */
import { useTranslation } from "react-i18next";
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
      className={`mt-1.5 rounded-full px-3 py-1 text-center text-[0.75rem] font-bold tabular-nums ${
        deciding ? "bg-amber-wash text-amber" : "text-ink2"
      }`}
    >
      {t("runoff.trailer", { total: f.total, gap: f.spread })}
    </p>
  );
}
