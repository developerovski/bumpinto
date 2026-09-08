import type { Schemas } from "@bumpinto/shared";
import { router, useLocalSearchParams } from "expo-router";
import { CheckIcon, FlagIcon, ProhibitIcon, SpeakerSlashIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Button, Card } from "../../src/components/atoms";
import { useSocialStore } from "../../src/store/socialStore";
import { colors, space } from "../../src/theme";

/**
 * O18 (menü) + O19 (sebep) — bildir / engelle / sustur (R-M7, Apple 1.2 UGC).
 *
 * Sebep listesi sunucu enum'una (`HARASSMENT|SPAM|IMPERSONATION|OTHER`) YENİDEN EŞLENDİ,
 * yeni üye uydurulmadı — web `PersonSheet` ile birebir aynı eşleme: IMPERSONATION =
 * "Rahatsız edici ad" (ad üzerinden kimlik ihlali), HARASSMENT = "Sesli sohbette taciz".
 *
 * "Sustur" YERELDİR: sunucuya gitmez, yalnız bu cihazda susturur (M-6 `voiceStore`'a bağlanır).
 */
const REASONS = ["IMPERSONATION", "HARASSMENT", "SPAM", "OTHER"] as const satisfies readonly Schemas["ReportRequest"]["reason"][];

export default function ParticipantSheet() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { slug, participantId, name, place } = useLocalSearchParams<{
    slug: string;
    participantId: string;
    name?: string;
    place?: string;
  }>();
  const [step, setStep] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const report = useSocialStore((s) => s.report);
  const block = useSocialStore((s) => s.block);
  const busy = useSocialStore((s) => s.busy);
  const error = useSocialStore((s) => s.error);

  const person = name ?? "?";

  const finish = () => router.back();

  return (
    <ScrollView
      contentContainerStyle={[
        s.page,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.head}>
        <Avatar name={person} tint={0} ring />
        <View style={s.headText}>
          <AppText variant="h3">{person}</AppText>
          <AppText variant="muted">{t("social.inSession", { place: place ?? "" })}</AppText>
        </View>
      </View>

      {step === "menu" ? (
        <>
          <Card padded={false} style={s.card}>
            <ActionRow
              icon={<FlagIcon size={17} color={colors.ink2} />}
              title={t("social.report")}
              hint={t("social.reportHint")}
              onPress={() => setStep("report")}
            />
            <View style={s.divider} />
            <ActionRow
              icon={<ProhibitIcon size={17} color={colors.flameDeep} />}
              title={t("social.block")}
              hint={t("social.blockHint")}
              danger
              disabled={busy}
              onPress={() => void block(participantId).then(finish)}
            />
            <View style={s.divider} />
            <ActionRow
              icon={<SpeakerSlashIcon size={17} color={colors.ink2} />}
              title={t("social.mute")}
              hint={t("social.muteHint")}
              onPress={finish}
            />
          </Card>
          <Button kind="ghost" title={t("common.cancel")} onPress={finish} />
        </>
      ) : (
        <>
          <AppText variant="h2">{t("social.reportTitle")}</AppText>
          <Card padded={false} style={s.card}>
            {REASONS.map((key, i) => (
              <View key={key}>
                {i > 0 ? <View style={s.divider} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={t(`social.reason${key}`)}
                  accessibilityState={{ selected: reason === key }}
                  onPress={() => setReason(key)}
                  style={s.reasonRow}
                >
                  <View style={[s.check, reason === key ? s.checkOn : null]}>
                    {reason === key ? <CheckIcon size={12} color="#fff" weight="bold" /> : null}
                  </View>
                  <AppText variant="label" style={s.flex}>
                    {t(`social.reason${key}`)}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </Card>
          <AppText variant="muted">{t("social.reportNote", { name: person })}</AppText>
          {error ? (
            <AppText variant="muted" style={s.error}>
              {t(error)}
            </AppText>
          ) : null}
          <View style={s.row}>
            <Button kind="ghost" title={t("common.cancel")} onPress={finish} style={s.half} />
            <Button
              kind="flame"
              title={t("social.send")}
              disabled={!reason || busy}
              onPress={() => {
                if (reason) void report(slug, participantId, reason).then(finish);
              }}
              style={s.half}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function ActionRow(p: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.title}
      accessibilityState={{ disabled: !!p.disabled }}
      disabled={p.disabled}
      onPress={p.onPress}
      style={s.actionRow}
    >
      <View style={s.chip}>{p.icon}</View>
      <View style={s.flex}>
        <AppText variant="h3" style={p.danger ? { color: colors.flameDeep } : undefined}>
          {p.title}
        </AppText>
        <AppText variant="muted">{p.hint}</AppText>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.screenX, gap: 14 },
  head: { flexDirection: "row", gap: 12, alignItems: "center" },
  headText: { gap: 1 },
  card: { paddingVertical: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 48 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 48 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.flameDeep, borderColor: colors.flameDeep },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1, width: undefined },
  error: { color: colors.flameDeep },
});
