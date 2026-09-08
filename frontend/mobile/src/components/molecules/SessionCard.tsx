import { sessionCtaKey, type Schemas } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { ACTIVITY_ICON } from "../../icons";
import { colors, space } from "../../theme";
import { AppText, Avatar, Button, Card, Progress, Sticker } from "../atoms";

type Summary = Schemas["SessionSummaryDto"];

/**
 * Artboard P1 · açık buluşma kartı. İlk kart vurgulu (`flameDeep` kenar + "Deste açık!"
 * çıkartması) — listenin sırası sunucudan gelir, kart kendi sırasını uydurmaz.
 */
export default function SessionCard(p: {
  session: Summary;
  featured?: boolean;
  onOpen: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const s0 = p.session;
  const total = s0.participantCount ?? 0;
  const done = s0.doneCount ?? 0;
  const people = s0.participants ?? [];
  const Activity = s0.activityTypes?.[0] ? ACTIVITY_ICON[s0.activityTypes[0]] : null;

  return (
    <Card tone={p.featured ? "flame" : undefined} style={s.card}>
      {p.featured ? <Sticker style={s.sticker}>{t("sessions.deckOpen")}</Sticker> : null}

      <AppText variant="h2">{s0.name}</AppText>

      <View style={s.meta}>
        {Activity ? <Activity size={15} color={colors.ink2} /> : null}
        <AppText variant="muted">
          {[
            s0.activityTypes?.map((a) => t(`activity.${a}`)).join(" · "),
            t(s0.sessionType === "SOLO" ? "sessions.solo" : "sessions.group"),
            t("sessions.people", { count: total }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      </View>

      <Progress
        value={total > 0 ? done / total : 0}
        label={t("sessions.doneOf", { done, total })}
        style={{ marginTop: 12 }}
      />

      <View style={s.footer}>
        <View style={s.stack}>
          {people.slice(0, 4).map((person, i) => (
            <Avatar
              key={`${person.displayName ?? ""}-${i}`}
              name={person.displayName ?? ""}
              tint={i}
              size="s"
              ring
              style={i === 0 ? undefined : { marginLeft: -9 }}
            />
          ))}
          <AppText variant="num" style={{ marginLeft: 8 }}>
            {t("sessions.doneOf", { done, total })}
          </AppText>
        </View>

        <Button
          small
          title={t(sessionCtaKey(s0.status))}
          onPress={() => p.onOpen(s0.slug ?? "")}
          style={s.cta}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: space.cardX, overflow: "visible" },
  sticker: { position: "absolute", right: 12, top: -12, zIndex: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  stack: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  cta: { width: "auto", flexShrink: 0 },
});
