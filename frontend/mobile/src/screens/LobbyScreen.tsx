import { activityListLabel, sessionActivities, type SessionView } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Button } from "../components/atoms";
import { InviteCard, MidpointCard, ScreenHeader } from "../components/molecules";
import ParticipantList from "../components/organisms/ParticipantList";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { ACTIVITY_ICON } from "../icons";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";
import { colors, space } from "../theme";

/**
 * Artboard P6 (orta noktalı, canlı) ve P7 (çapalı, tek kişi) — GRUP oturumunun HOST görünümü.
 *
 * Çerçeve K-M26: `.top` / `.scroll` / `.cta` KARDEŞ; "Mekanları bul" sabit alt çubukta.
 *
 * ÇAPALI oturumda (P7) merkez katılımcılardan türemez, bu yüzden backend'in "en az 2 konum"
 * önkoşulu düşer — kapı da bilmeli, yoksa sunucu kabul ederken düğme kapalı kalır ve oturum
 * COLLECTING'de asılı kalır.
 */
export default function LobbyScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadView = useSessionStore((s) => s.loadView);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = view.slug ?? "";
  const anchored = view.anchored === true;
  const participants = view.participants ?? [];
  const located = participants.filter((p) => p.hasLocation).length;
  const activities = sessionActivities(view);
  // Çapalıda kimsenin konumu BEKLENMİYOR: "X yetişemezse sonradan katılır" cümlesi orada
  // yanlış beklenti kurar (üstelik tek kişilik çapalı oturumda host'un KENDİSİNİ işaret eder).
  const waiting = anchored ? undefined : participants.find((p) => !p.hasLocation);

  async function findVenues() {
    setBusy(true);
    setError(null);
    try {
      await api.findVenues(slug);
      await loadView(slug);
    } catch {
      setError("lobby.errFind");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={view.name || activityListLabel(activities, t, i18n.resolvedLanguage ?? "tr")}
        backLabel={t("shell.sessions")}
        onBack={() => router.replace("/sessions")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.badges}>
          {activities.map((a) => {
            const Icon = ACTIVITY_ICON[a as keyof typeof ACTIVITY_ICON];
            return (
              <Badge
                key={a}
                tone="flame"
                icon={Icon ? <Icon size={13} color={colors.flameDeep} /> : undefined}
              >
                {t(`activity.${a}`)}
              </Badge>
            );
          })}
          {/* Durum 390'da rozet DEĞİL düz metin (artboard P6/P7 `· konumlar toplanıyor`). */}
          <AppText variant="muted">
            {`· ${t(anchored ? "lobby.anchoredBadge" : "lobby.collecting")}`}
          </AppText>
        </View>

        <InviteCard
          slug={slug}
          joinCode={view.joinCode}
          sessionName={view.name}
          compact={participants.length > 1}
        />

        <MidpointCard view={view} />

        <ParticipantList
          participants={participants}
          slug={slug}
          viewerId={view.viewer?.participantId}
          anchored={anchored}
          step="locations"
        />

        <AppText variant="muted" style={s.note}>
          {t(anchored ? "lobby.anchoredNote" : "lobby.privacy")}
        </AppText>

        <VoiceDockSlot slug={slug} />
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 84 }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={t("newSession.findVenues")}
          disabled={busy || (!anchored && located < 2)}
          onPress={() => void findVenues()}
        />
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : waiting ? (
          <AppText variant="muted" style={s.ctaNote}>
            {t("lobby.late", { name: waiting.displayName ?? "" })}
          </AppText>
        ) : anchored ? (
          /* Tek kişilik çapalı oturumda CTA altı boş kalmasın: "yeterli kişi yok" hissi
             verirdi, oysa çapalıda tek başına aramak geçerli bir yol. */
          <AppText variant="muted" style={s.ctaNote}>
            {t("lobby.anchoredSolo")}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: space.gap },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  ctaNote: { textAlign: "center" },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  note: { fontSize: 12 },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
});
