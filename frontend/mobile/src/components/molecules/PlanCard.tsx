import {
  GROUP_TINT,
  formatDuration,
  groupOf,
  isInProgress,
  meetAtOptions,
  monogram,
  remainingMinutes,
  type PlanCardDto,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { LightningIcon } from "phosphor-react-native";
import { Trans, useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts, photoTints, radius, shadow } from "../../theme";
import { AppText, Avatar, Sticker } from "../atoms";
import SeatDots from "./SeatDots";

/**
 * Keşfet POC P1m `.pl` — açık plan kartı.
 *
 * Kart kesin konum TAŞIMAZ: yalnız sunucunun kaba semti (`locality`) ve yuvarlanmış konumdan
 * dakika. Veride olmayan çizilmez: host'un alt satırı ("İzmir'den…"), fotoğraf, şehir — API'de
 * yok. 390 artboard'ında dakikanın ulaşım eki de basılmıyor (web de 390'da gizliyor).
 */
export default function PlanCard(p: { plan: PlanCardDto; now: Date; onOpen: (slug: string) => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const plan = p.plan;
  const live = isInProgress(plan, p.now) && !!plan.openUntil;
  const approved = plan.approvedSeats ?? 0;
  const capacity = plan.capacity ?? 0;
  const tint = photoTints[GROUP_TINT[groupOf(plan.activityTypes?.[0] ?? "COFFEE")]];
  const meetAt = plan.meetAt ? new Date(plan.meetAt) : null;
  const when = meetAt
    ? new Intl.DateTimeFormat(lang, meetAtOptions(meetAt, p.now, "short")).format(meetAt)
    : null;
  const remaining = live
    ? t("discover.remaining", { time: formatDuration(remainingMinutes(plan.openUntil!, p.now), t) })
    : null;

  /* Satır parçaları: veride olmayan parça (semt, dakika) ayraçıyla birlikte düşer. */
  const meta = [
    live ? (
      <View key="now" style={s.now}>
        <View style={s.nowDot} />
        <AppText variant="muted" style={s.nowText}>
          {t("discover.nowLabel")}
        </AppText>
      </View>
    ) : null,
    live ? (
      <AppText key="rem" variant="muted" style={s.strong}>
        {remaining}
      </AppText>
    ) : when ? (
      <AppText key="when" variant="muted" style={s.strong}>
        {when}
      </AppText>
    ) : null,
    plan.locality ? (
      <AppText key="loc" variant="muted">
        {plan.locality}
      </AppText>
    ) : null,
    plan.minutes != null ? (
      <AppText key="min" variant="muted" style={s.strong}>
        {t("discover.minutes", { minutes: plan.minutes })}
      </AppText>
    ) : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={plan.name}
      accessibilityHint={[live ? `${t("discover.nowLabel")} ${remaining}` : when, plan.locality,
        t("discover.seatsAria", { approved, capacity })].filter(Boolean).join(", ")}
      onPress={() => plan.slug && p.onOpen(plan.slug)}
      style={({ pressed }) => [s.card, pressed ? { transform: [{ scale: 0.99 }] } : null]}
    >
      <LinearGradient colors={[...tint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photo}>
        <AppText
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={s.mono}
        >
          {monogram(plan.name)}
        </AppText>
        {live ? (
          <Sticker
            tone="amber"
            icon={<LightningIcon size={13} color={colors.amberInk} weight="fill" />}
            style={s.sticker}
          >
            {t("discover.nowSticker", { approved, capacity })}
          </Sticker>
        ) : plan.confirmed ? (
          <Sticker style={s.sticker}>{t("discover.confirmed", { approved, capacity })}</Sticker>
        ) : null}
      </LinearGradient>

      <View style={s.body}>
        <AppText variant="h3" style={s.title}>
          {plan.name}
        </AppText>
        {meta.length > 0 ? (
          <View style={s.meta}>
            {meta.flatMap((node, i) =>
              i === 0
                ? [node]
                : [
                    <AppText key={`sep${i}`} variant="muted">
                      ·
                    </AppText>,
                    node,
                  ],
            )}
          </View>
        ) : null}
        <View style={s.foot}>
          <View style={s.host}>
            <Avatar name={plan.hostDisplayName ?? "?"} tint={0} size="s" ring />
            <AppText variant="muted" numberOfLines={1} style={s.hostText}>
              <Trans
                i18nKey="discover.hostedBy"
                values={{ name: plan.hostDisplayName ?? "" }}
                components={[<AppText key="0" variant="muted" style={s.strong} />]}
              />
            </AppText>
          </View>
          <SeatDots approved={approved} capacity={capacity} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.s1,
  },
  // Kart `overflow: hidden` ALMAZ (iOS gölgeyi keserdi) — köşe gradyanın kendisinde.
  photo: {
    height: 96,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  mono: {
    fontFamily: fonts.head,
    fontSize: 36,
    color: colors.photoMono,
    transform: [{ rotate: "-4deg" }],
  },
  sticker: { position: "absolute", right: 10, top: 10 },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 9 },
  title: { fontSize: 17, lineHeight: 20 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 2 },
  strong: { color: colors.ink, fontWeight: "700" },
  now: { flexDirection: "row", alignItems: "center", gap: 5 },
  nowDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.amberInk },
  nowText: { color: colors.amberInk, fontWeight: "700" },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  host: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, minWidth: 0 },
  hostText: { flexShrink: 1 },
});
