import {
  fairnessLine,
  fairnessOf,
  fitsActivity,
  formatRating,
  type SwipeDir,
  type TravelInfo,
  type VenueDto,
} from "@bumpinto/shared";
import { ArrowCounterClockwiseIcon, HeartIcon, XIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, radius, shadow, space } from "../../theme";
import { AppText, Badge, IconButton } from "../atoms";
import Attribution from "../molecules/Attribution";
import TravelBars from "../molecules/TravelBars";
import VenueThumb from "../molecules/VenueThumb";
import SwipeCard from "./SwipeCard";

/**
 * P14 — deste: üstteki üç kart yığını + üç eylem düğmesi.
 *
 * Düğmeler SÜS DEĞİL: kaydırma jesti ince motor beceri ister ve TalkBack/VoiceOver altında
 * hiç yoktur — karar vermenin dokunmayla da mümkün olması erişilebilirlik gereğidir
 * (GUIDE kural 4). Aynı `onDecide` yolundan geçerler, ikinci bir karar dalı yok.
 *
 * Yalnız üç kart çizilir: `venues` 20 uzunluğunda olabilir ve hepsini ağaçta tutmak her
 * kaydırmada 20 `TravelBars` yeniden hesaplatır.
 */
const STACK = 3;

export default function SwipeDeck(p: {
  venues: VenueDto[];
  index: number;
  travel: TravelInfo;
  /** Oturumun mekan listesindeki TÜM kategoriler — uyum satırının çizilip çizilmeyeceği. */
  categories?: string[];
  canUndo: boolean;
  onDecide: (dir: SwipeDir) => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  // Öndeki kartın sürükleme ilerlemesi: arkadaki kart ona göre öne gelir.
  const [progress, setProgress] = useState(0);

  const stack = p.venues.slice(p.index, p.index + STACK);
  if (stack.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.stage}>
        {/* Arkadan öne çizilir: son çocuk en üstte durur (RN'de z-index yerine SIRA). */}
        {stack
          .map((venue, depth) => ({ venue, depth }))
          .reverse()
          .map(({ venue, depth }) => {
            // Ön kart sürüklendikçe arkadakiler bir kademe öne gelir.
            const eased = Math.max(0, depth - progress);
            const body = (
              <DeckCard
                venue={venue}
                travel={p.travel}
                categories={p.categories}
                // Yalnız ÖN kart okunur: arkadakiler ekran okuyucuda kart yığınını üç kez tekrar ederdi.
                muted={depth > 0}
              />
            );
            return depth === 0 ? (
              <SwipeCard key={venue.id} onSwipe={p.onDecide} onProgress={setProgress}>
                {body}
              </SwipeCard>
            ) : (
              <View
                key={venue.id}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  s.behind,
                  { transform: [{ scale: 1 - eased * 0.04 }, { translateY: eased * 10 }] },
                ]}
              >
                {body}
              </View>
            );
          })}
      </View>

      <View style={s.actions}>
        <IconButton
          kind="ghost"
          label={t("deck.ariaUndo")}
          disabled={!p.canUndo}
          onPress={p.onUndo}
          icon={<ArrowCounterClockwiseIcon size={20} color={colors.ink2} weight="bold" />}
        />
        <IconButton
          label={t("deck.ariaPass")}
          onPress={() => p.onDecide("left")}
          style={s.big}
          icon={<XIcon size={26} color={colors.flameDeep} weight="bold" />}
        />
        <IconButton
          label={t("deck.ariaLike")}
          onPress={() => p.onDecide("right")}
          style={s.big}
          icon={<HeartIcon size={26} color={colors.grass} weight="fill" />}
        />
      </View>
    </View>
  );
}

/**
 * Kart yüzeyi (artboard `.card`): 236px görsel → ad + adalet rozeti → meta → uyum notu →
 * `TravelBars` → atıf.
 *
 * Adalet baş cümlesi BAŞLIKTA rozet olarak duruyor, bu yüzden `TravelBars` alt satırında
 * `hideLead` ile tekrar edilmez — aynı hesabın iki sunumu, iki kural değil.
 */
function DeckCard(p: {
  venue: VenueDto;
  travel: TravelInfo;
  categories?: string[];
  muted?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "tr";
  const v = p.venue;

  const f = fairnessOf(v);
  const lead = f ? fairnessLine(f, p.travel, t) : null;

  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const meta = [
    v.rating != null ? `★ ${formatRating(locale, v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    v.hoursToday ? t("venue.hoursToday", { hours: v.hoursToday }) : null,
    v.locality,
  ].filter((x): x is string => !!x);

  const varied = !p.categories || new Set(p.categories.filter(Boolean)).size >= 2;
  const fit =
    v.category && v.activityType && varied
      ? {
          ok: fitsActivity(v.activityType, v.category),
          activity: t(`activity.${v.activityType}`),
          category: v.category.toLocaleLowerCase(locale),
        }
      : null;

  return (
    <View style={s.card}>
      <VenueThumb venue={v} width={undefined} height={236} style={s.photo} />

      <View style={s.body}>
        <View style={s.titleRow}>
          <AppText variant="h2" numberOfLines={2} style={s.title}>
            {v.name}
          </AppText>
          {lead?.lead ? (
            <Badge tone={lead.leadTone === "amber" ? "amber" : "grass"}>{lead.lead}</Badge>
          ) : null}
        </View>

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

        <TravelBars venue={v} travel={p.travel} hideLead />
        {p.muted ? null : <Attribution providers={v.provider ? [v.provider] : []} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.gap },
  stage: { position: "relative" },
  behind: { position: "absolute", top: 0, left: 0, right: 0 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.s2,
  },
  photo: { width: "100%", borderRadius: 0 },
  body: { padding: space.cardX, gap: 6 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, minWidth: 0 },
  meta: { color: colors.ink2, fontSize: 12.5 },
  fitOff: { color: colors.amberInk, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22 },
  big: { width: 62, height: 62, borderRadius: 31 },
});
