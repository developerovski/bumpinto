import { fairnessOf, formatRating, type TravelInfo, type VenueDto } from "@bumpinto/shared";
import { CheckIcon } from "phosphor-react-native";
import { Trans, useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, radius, shadow, space } from "../../theme";
import { AppText, Badge } from "../atoms";
import RangeBar from "../molecules/RangeBar";
import VenueThumb from "../molecules/VenueThumb";

/**
 * Artboard P18 `.rc-fin` — finalist kartı. Seçim RADYO davranışıdır: iki finalistten TEK biri
 * işaretli olabilir, bu yüzden rol `radio` (checkbox değil) — ekran okuyucu "1 / 2" der.
 *
 * "Kararı veren" finalist (`isDeciding`, shared) amber-wash alır: iki yer arasında ≥5 dk ya da
 * ≥0.3★ fark varsa kullanıcıya SEBEP gösterilir. Eşik ve kıyas shared'da; burada ikinci hesap yok.
 *
 * Seçilmemiş kart soluk (%75) ama OKUNUR kalır — karşılaştırma yapılamayan bir seçim ekranı
 * seçim ekranı değildir.
 */
export default function RunoffCard(p: {
  venue: VenueDto;
  travel: TravelInfo;
  selected: boolean;
  deciding: boolean;
  /** Yalnız beraberlikte dolu gelir (sunucu kapılı `voteTally`). */
  votes?: number;
  midpointLabel?: string;
  onSelect?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const v = p.venue;
  const locale = i18n.resolvedLanguage ?? "tr";
  const f = fairnessOf(v);

  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const locality = v.locality && v.locality !== p.midpointLabel ? v.locality : null;
  const meta = [
    v.rating != null ? `★ ${formatRating(locale, v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    locality,
  ].filter((x): x is string => !!x);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={v.name}
      accessibilityState={{ selected: p.selected, disabled: !p.onSelect }}
      disabled={!p.onSelect}
      onPress={p.onSelect}
      style={({ pressed }) => [
        s.card,
        p.deciding ? s.deciding : null,
        p.selected ? s.selected : s.dim,
        pressed && p.onSelect ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={s.head}>
        <VenueThumb venue={v} width={70} height={70} style={s.thumb} />
        <View style={s.title}>
          <View style={s.nameRow}>
            <AppText variant="h3" numberOfLines={2} style={s.name}>
              {v.name}
            </AppText>
            {p.votes != null ? (
              <Badge tone="neutral">{t("runoff.voteCount", { count: p.votes })}</Badge>
            ) : null}
          </View>
          {meta.length > 0 ? (
            <AppText variant="num" style={s.meta}>
              {meta.join(" · ")}
            </AppText>
          ) : null}
        </View>
        <View style={[s.chk, p.selected ? s.chkOn : null]}>
          {p.selected ? <CheckIcon size={14} color="#fff" weight="bold" /> : null}
        </View>
      </View>

      <RangeBar venue={v} travel={p.travel} />

      {/* Kartın ALTINDAKİ tek satır: toplam + fark. `fairnessOf`tan; ikinci hesap yok. */}
      {f ? (
        <AppText variant="muted" style={s.trailer}>
          <Trans
            i18nKey="runoff.trailer"
            values={{ total: f.total, gap: f.spread }}
            components={[<AppText key="0" variant="muted" style={s.trailerEmph} />]}
          />
        </AppText>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: space.cardX,
    gap: 8,
    ...shadow.s1,
  },
  deciding: { backgroundColor: colors.amberWash, borderColor: colors.amberWash },
  selected: { borderColor: colors.flameDeep },
  dim: { opacity: 0.75 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  // Artboard'da finalist görseli hafif eğik durur — kart yığınının "elde tutulan" dilini sürdürür.
  thumb: { transform: [{ rotate: "-2deg" }] },
  title: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, minWidth: 0 },
  meta: { color: colors.ink2, fontSize: 12 },
  chk: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: "center",
    justifyContent: "center",
  },
  chkOn: { backgroundColor: colors.flameDeep, borderColor: colors.flameDeep },
  trailer: { fontSize: 12 },
  trailerEmph: { color: colors.ink, fontWeight: "700" },
});
