import { BADGES, badgesFor, type StatsDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { BADGE_ICON } from "../../lib/badgeIcons";
import { colors, fonts, radius } from "../../theme";
import { AppText, Card, HandNote } from "../atoms";

/**
 * Keşfet POC P6 — profil sayaçları + rozetler. Sunucu yalnız SAYAR (`stats`), rozet istemcide türer
 * (shared `badges.ts`) — web `BadgeRow` ile aynı kural. Sayaçlar spec §11.6: açtığın · buluşma ·
 * hafta seri; `friendsMet` artık çizilmez.
 */
export default function BadgeGrid({ stats }: { stats: StatsDto | undefined | null }) {
  const { t } = useTranslation();
  const plansMet = stats?.plansMet ?? 0;
  const streak = stats?.metStreakWeeks ?? 0;
  const earned = badgesFor(stats);
  const counters: [number, string][] = [
    [stats?.sessionsHosted ?? 0, t("profile.statHosted")],
    [plansMet, t("profile.statMet")],
    [streak, t("profile.statStreak")],
  ];

  return (
    <View style={s.wrap}>
      <Card padded={false} style={s.stats}>
        {counters.map(([value, label], i) => (
          <View key={label} style={[s.stat, i ? s.statDivider : null]}>
            <AppText style={s.statNum}>{value}</AppText>
            <AppText variant="muted">{label}</AppText>
          </View>
        ))}
      </Card>

      <AppText variant="over">{t("profile.badges")}</AppText>
      <View style={s.grid}>
        {BADGES.map((b) => {
          const on = earned.includes(b.id);
          const have = b.of === "met" ? plansMet : streak;
          const Icon = BADGE_ICON[b.id];
          const title = t(`badge.${b.id}.title`);
          const body = on
            ? t(`badge.${b.id}.hint`)
            : t(b.of === "met" ? "badge.progressMet" : "badge.progressStreak", {
                have,
                goal: b.goal,
                count: b.goal - have,
              });
          return (
            /* Kazanım durumu RENKLE değil sözle de söylenir (soluk kart ekran okuyucuya ulaşmaz). */
            <View
              key={b.id}
              accessible
              accessibilityLabel={`${title} · ${t(on ? "badge.earned" : "badge.locked")}`}
              accessibilityHint={body}
              style={s.cell}
            >
              <Card style={[s.badge, on ? null : s.off]}>
                <View style={[s.icon, on ? s.iconOn : s.iconOff]}>
                  <Icon size={24} color={on ? colors.ink : colors.ink3} />
                </View>
                <AppText style={s.name}>{title}</AppText>
                <AppText variant="muted" style={s.body}>
                  {body}
                </AppText>
              </Card>
            </View>
          );
        })}
      </View>
      <HandNote>{t("profile.badgesHand")}</HandNote>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  stats: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 6 },
  stat: { flex: 1, alignItems: "center", gap: 1 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  statNum: { fontFamily: fonts.head, fontSize: 26, lineHeight: 30, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { flexBasis: "46%", flexGrow: 1 },
  badge: { alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 10 },
  off: { opacity: 0.5 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  iconOn: { backgroundColor: colors.highlight, borderColor: colors.ink },
  iconOff: { backgroundColor: colors.sand, borderColor: colors.lineIn, borderStyle: "dashed" },
  name: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink, textAlign: "center" },
  body: { fontSize: 12, textAlign: "center" },
});
