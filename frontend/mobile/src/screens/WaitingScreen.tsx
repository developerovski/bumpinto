import type { SessionView } from "@bumpinto/shared";
import { router } from "expo-router";
import { CarIcon, CheckIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card, Wordmark } from "../components/atoms";
import { LanguageButton, MidpointCard } from "../components/molecules";
import ParticipantList from "../components/organisms/ParticipantList";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { colors, space } from "../theme";

/**
 * Artboard P10 · Bekle — DAVETLİ görünümü, canlı.
 *
 * Kabuk davetliye göre: wordmark + dil düğmesi (misafirin hesabı yok, tercih sayfasına
 * gidemez). Alt çubukta CTA DEĞİL bir güvence cümlesi var — bu ekranda davetlinin yapacağı
 * bir şey yok, bekliyor.
 *
 * "Dürt" düğmesi ÇİZİLMEZ (K-M4) — artboard'da var ama presence 2.0 M-9'un işi.
 */
export default function WaitingScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const slug = view.slug ?? "";
  const anchored = view.anchored === true;
  const participants = view.participants ?? [];
  const viewerId = view.viewer?.participantId;
  const self = participants.find((p) => p.id === viewerId) ?? null;

  return (
    <View style={s.screen}>
      <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <LanguageButton />
      </View>

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Card tone="grass" style={s.joined}>
          <View style={s.check}>
            <CheckIcon size={15} color={colors.grass} weight="bold" />
          </View>
          <View style={s.joinedText}>
            <AppText variant="label" style={s.joinedTitle}>
              {t("waiting.joined")}
            </AppText>
            <AppText variant="muted">
              {[self?.locationLabel, self?.displayName].filter(Boolean).join(" · ")}
            </AppText>
          </View>
        </Card>

        <MidpointCard view={view} />

        <View style={s.preparing}>
          <AppText variant="h2" style={s.center}>
            {t("waiting.preparing")}
          </AppText>
          <AppText variant="muted" style={s.center}>
            {t("waiting.copyMobile")}
          </AppText>
        </View>

        <ParticipantList
          participants={participants}
          slug={slug}
          viewerId={viewerId}
          anchored={anchored}
          step="locations"
        />

        {/* Konumunu ya da ulaşım türünü değiştirmek davetlinin TEK eylemi — alt sayfada. */}
        <Button
          small
          kind="white"
          title={t("waiting.changeLocationAndMode")}
          icon={<CarIcon size={16} color={colors.ink} />}
          onPress={() => router.push({ pathname: "/(sheets)/location-mode", params: { slug } })}
        />

        <VoiceDockSlot slug={slug} />
      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <AppText variant="muted" style={s.center}>
          {t("waiting.closeHint")}
        </AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: 8,
    backgroundColor: colors.paper,
  },
  page: { paddingHorizontal: space.screenX, paddingBottom: 24, gap: 10 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, backgroundColor: colors.paper },
  joined: {
    backgroundColor: colors.grassWash,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: space.rowY,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  joinedText: { flex: 1, gap: 2 },
  joinedTitle: { fontWeight: "700", color: colors.grass },
  preparing: { alignItems: "center", gap: 4, paddingVertical: 2 },
  center: { textAlign: "center" },
});
