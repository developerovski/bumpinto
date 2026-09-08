import type { ParticipantDto } from "@bumpinto/shared";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, space } from "../../theme";
import { MODE_ICON } from "../../icons";
import { AppText, Avatar, Badge } from "../atoms";

/**
 * Oturum katılımcı satırı (O18 `.srow`). M-7 lobisi ve M-8 karar ekranı bunu kullanır.
 *
 * ENGELLENMİŞ satır kimliği ve konumu GİZLER (Apple 1.2): ad yerine "Engellenen kişi",
 * gri monogram, konum/ulaşım satırı hiç çizilmez. Engelleme tek yönlüdür; karşı taraf
 * engellendiğini görmez, bu yüzden bu gizleme yalnız engelleyenin ekranındadır.
 *
 * Uzun basma bildir/engelle alt sayfasını açar — kendisi hariç.
 */
export default function ParticipantRow(p: {
  participant: ParticipantDto;
  slug?: string;
  index?: number;
  self?: boolean;
  ready?: boolean;
}) {
  const { t } = useTranslation();
  const person = p.participant;
  const blocked = person.blocked === true;
  const name = blocked ? t("social.blockedName") : (person.displayName ?? "?");
  // EBIKE iki glif basar (bisiklet + şimşek) — `MODE_ICON` bu yüzden DİZİ döner.
  const modeIcons = person.travelMode ? MODE_ICON[person.travelMode] : [];

  const openSheet = () => {
    if (p.self || blocked || !p.slug || !person.id) return;
    router.push({
      pathname: "/(sheets)/participant",
      params: {
        slug: p.slug,
        participantId: person.id,
        name: person.displayName ?? "",
        place: person.locationLabel ?? "",
      },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={p.self || blocked ? undefined : t("social.longPressHint")}
      onLongPress={openSheet}
      delayLongPress={400}
      style={s.row}
    >
      {/* Engellenmiş satırda avatar NÖTR: kişinin rengi kimliğidir, onu da göstermeyiz. */}
      <Avatar
        name={blocked ? "·" : name}
        tint={p.index ?? 0}
        online={blocked ? undefined : person.online}
        ring={!blocked}
      />
      <View style={s.text}>
        <AppText variant="label" style={s.name}>
          {name}
        </AppText>
        {blocked ? null : (
          <AppText variant="muted">
            {[person.locationLabel, person.midpointMinutes ? `~${person.midpointMinutes} dk` : null]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        )}
      </View>
      {blocked ? (
        <Badge>{t("social.blockedRow")}</Badge>
      ) : p.ready ? (
        <Badge tone="grass">{t("waiting.ready")}</Badge>
      ) : null}
      {blocked
        ? null
        : modeIcons.map((Mode, i) => (
            <Mode key={i} size={i === 0 ? 14 : 9} color={colors.ink2} />
          ))}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: space.rowY,
    paddingHorizontal: space.cardX,
  },
  text: { flex: 1, gap: 2 },
  name: { fontWeight: "700" },
});
