import { fitsActivity, formatRating, type TravelInfo, type VenueDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, space } from "../../theme";
import { AppText, Button } from "../atoms";
import RangeBar from "./RangeBar";
import VenueThumb from "./VenueThumb";

/**
 * Artboard P11/P12 `.f-lk` / `.vrow` — mekan satırı: 56×64 küçük resim + ad + meta + uyum
 * satırı + yol çubuğu.
 *
 * Adalet ROZETİ YOK: aynı cümle `RangeBar`ın alt satırında yaşıyor (rozet çorbası yasağı).
 *
 * Eksik alan SATIRI DÜŞÜRÜR, uydurulmaz: puanı olmayan mekanda "★ —" yazılmaz, kategorisi
 * çözülemeyende uyum satırı hiç çizilmez.
 *
 * GRUP modunda satır AKSİYONSUZDUR (karar deste + runoff'tan çıkar); SOLO'da (P12) her satırın
 * sonunda "Bunu seç" durur.
 */
export default function VenueRow(p: {
  venue: VenueDto;
  travel: TravelInfo;
  tint?: number;
  /** Listedeki TÜM kategoriler — ≥2 farklı değer yoksa uyum satırı gizlenir (§4.6:
      "12 aynı kart" hepsine aynı uyarıyı yazardı). */
  categories?: string[];
  /** `SessionView.midpointLabel` — semt bununla AYNIYSA meta satırında tekrar edilmez (§4.9). */
  midpointLabel?: string;
  /** SOLO: satır sonundaki düğmenin metni. Verilmezse düğme HİÇ basılmaz. */
  selectLabel?: string;
  onSelect?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const v = p.venue;
  const locale = i18n.resolvedLanguage ?? "tr";

  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const locality = v.locality && v.locality !== p.midpointLabel ? v.locality : null;
  const meta = [
    v.rating != null ? `★ ${formatRating(locale, v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    v.hoursToday ? t("venue.hoursToday", { hours: v.hoursToday }) : null,
    locality,
  ].filter((x): x is string => !!x);

  // Uyum satırı MEKANIN KENDİ alanına bakar (`activityType`): karışık destede oturumun ilk
  // alanına bakmak her yürüyüş kartına "kahve değil" yazdırırdı.
  const varied = !p.categories || new Set(p.categories.filter(Boolean)).size >= 2;
  const fit =
    v.category && v.activityType && varied
      ? {
          ok: fitsActivity(v.activityType, v.category),
          activity: t(`activity.${v.activityType}`),
          category: v.category.toLocaleLowerCase(locale),
        }
      : null;
  const tagline = typeof v.tagline === "string" && v.tagline.trim() ? v.tagline.trim() : null;

  return (
    <View style={s.row}>
      <VenueThumb venue={v} tint={p.tint} />
      <View style={s.body}>
        <AppText variant="h3">{v.name}</AppText>
        {meta.length > 0 ? (
          <AppText variant="num" style={s.meta}>
            {meta.join(" · ")}
          </AppText>
        ) : null}
        {fit ? (
          <AppText variant="muted" style={fit.ok ? null : s.fitOff}>
            {t(fit.ok ? "venue.fitOk" : "venue.fitOff", {
              activity: fit.activity,
              category: fit.category,
            })}
          </AppText>
        ) : null}
        {/* "Neyle bilinir" — alan gelmezse satır HİÇ çizilmez (R-M8). */}
        {tagline ? (
          <AppText variant="muted" style={s.tagline}>
            {tagline}
          </AppText>
        ) : null}
        <RangeBar venue={v} travel={p.travel} />
      </View>
      {p.selectLabel && p.onSelect ? (
        <Button
          small
          kind="white"
          title={p.selectLabel}
          onPress={p.onSelect}
          style={s.select}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: space.rowY,
    paddingHorizontal: 14,
  },
  body: { flex: 1, gap: 4, minWidth: 0 },
  meta: { color: colors.ink2, fontSize: 12 },
  fitOff: { color: colors.amberInk, fontWeight: "600" },
  tagline: { color: colors.ink3 },
  select: { width: "auto", flexShrink: 0, alignSelf: "center" },
});
