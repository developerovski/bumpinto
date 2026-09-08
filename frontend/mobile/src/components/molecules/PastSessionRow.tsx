import { monogram } from "@bumpinto/shared";
import type { Schemas } from "@bumpinto/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, photoTints, radius, space } from "../../theme";
import { AppText, Badge } from "../atoms";

type Summary = Schemas["SessionSummaryDto"];

/**
 * Artboard P1 · geçmiş buluşma satırı. Fotoğraf yoksa mekan monogramı + `photoTints`
 * gradyanı basılır (mekan paleti; kişi paleti AYRI — `personTint`).
 */
export default function PastSessionRow(p: {
  session: Summary;
  index: number;
  onOpen: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const s0 = p.session;
  const photo = s0.decidedVenuePhotoUrl;
  const tint = photoTints[p.index % photoTints.length];
  const badge = badgeOf(s0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={s0.name}
      onPress={() => p.onOpen(s0.slug ?? "")}
      style={({ pressed }) => [s.row, pressed ? { opacity: 0.7 } : null]}
    >
      <View style={s.thumb}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.thumbFill} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={[...tint]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.thumbFill, s.mono]}
          >
            <AppText variant="num" style={{ color: colors.ink, fontSize: 15 }}>
              {monogram(s0.decidedVenueName ?? s0.name)}
            </AppText>
          </LinearGradient>
        )}
      </View>

      <View style={s.body}>
        <AppText variant="h3" numberOfLines={1}>
          {s0.name}
        </AppText>
        <AppText variant="muted" numberOfLines={1}>
          {[s0.decidedVenueName, t("sessions.people", { count: s0.participantCount ?? 0 })]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      </View>

      <Badge tone={badge.tone}>{t(badge.key)}</Badge>
    </Pressable>
  );
}

/** Durum → rozet. `DECIDED` gidildi, `EXPIRED` karar çıkmadı, dolu oturum "Doldu". */
function badgeOf(s0: Summary): { key: string; tone: "grass" | "neutral" | "amber" } {
  if (s0.status === "DECIDED") return { key: "sessions.went", tone: "grass" };
  if (s0.status === "EXPIRED") return { key: "sessions.noDecision", tone: "neutral" };
  return { key: "sessions.full", tone: "amber" };
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.gap,
    paddingVertical: space.rowY,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.thumb, overflow: "hidden" },
  thumbFill: { width: "100%", height: "100%" },
  mono: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
});
