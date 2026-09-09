import {
  attributionProviders,
  allVoted,
  isDeciding,
  sessionActivities,
  activityListLabel,
  votersOf,
  type SessionView,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { ChatCircleIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import RunoffCard from "../components/organisms/RunoffCard";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { api, webBase } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P18 — iki (ya da daha çok) finalist arasında TEK seçim.
 *
 * Seçim İKİ ADIM: karta dokunmak seçer, "Seçimimi kilitle" gönderir. Runoff oyu GERİ
 * ALINAMAZ; tek dokunuşta gitseydi listeyi kaydırırken değen bir parmak oyu harcardı.
 * Web `RunoffScreen` de aynı iki adımı uygular.
 *
 * Kendi oyu SUNUCUDAN okunur (`viewer.runoffVoteVenueId`); yerel `choice` yalnız henüz
 * gönderilmemiş seçimi tutar. Tersi olsaydı uygulama yeniden açılınca kişi "kilitli" yazısını
 * görür ama NEYİ kilitlediğini göremezdi.
 */
export default function RunoffScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);
  const loadView = useSessionStore((s) => s.loadView);

  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = view.slug ?? "";
  const selfId = view.viewer?.participantId;
  const venues = view.venues ?? [];
  const finalists = venues.filter((v) => v.id && view.runoffVenueIds?.includes(v.id));

  const voted = view.runoffVotedParticipantIds ?? [];
  const voters = votersOf(view.participants ?? []);
  const sent = !!selfId && voted.includes(selfId);
  const selected = choice ?? view.viewer?.runoffVoteVenueId ?? null;

  // Beraberlik: oy verebilecek HERKES oy verdi ama oturum hâlâ RUNOFF. Tek kazanan çıksaydı
  // sunucu DECIDED'a geçerdi — ayrı bir alan gerekmiyor.
  const tie = allVoted(voters, voted);
  const waiting = voters.filter((p) => p.id && !voted.includes(p.id));
  // §4.8: tam bir kişi kaldıysa ADLI ve olumlu cümle; kalabalıkta kişisiz genel cümle.
  const lockedNote =
    waiting.length === 1
      ? t("runoff.lockedCopyName", { name: waiting[0].displayName ?? "" })
      : t("runoff.lockedCopy");

  const title = tie
    ? t("runoff.titleTwo")
    : sent
      ? t("runoff.titleSent")
      : t(finalists.length > 2 ? "runoff.titleMany" : "runoff.titleTwo");

  async function lock() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.runoffVote(slug, { venueId: selected });
      await loadView(slug);
    } catch {
      setError("runoff.errVote");
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    await Share.share({
      message: `${t("runoff.remindText")} ${webBase}/j/${slug}`,
    }).catch(() => undefined);
  }

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="over">
          {t("runoff.overline", {
            activity: activityListLabel(sessionActivities(view), t, i18n.resolvedLanguage ?? "tr"),
            count: voters.length,
          })}
        </AppText>
        <AppText variant="h1">{title}</AppText>
        <AppText variant="muted">
          {t(
            view.runoffReason === "FALLBACK"
              ? "runoff.copyFallback"
              : sent
                ? "runoff.copySent"
                : "runoff.copy",
          )}
        </AppText>

        {finalists.map((venue) => (
          <RunoffCard
            key={venue.id}
            venue={venue}
            travel={travel}
            selected={selected === venue.id}
            deciding={isDeciding(venue, finalists)}
            votes={view.voteTally?.[venue.id!]}
            midpointLabel={view.midpointLabel}
            // Kilitlendikten sonra kart AKSİYONSUZ: dokunmak hiçbir şey yapmıyorsa dokunulabilir
            // görünmemeli.
            onSelect={sent ? undefined : () => setChoice(venue.id ?? null)}
          />
        ))}

        {/* Sayaç ve not AYRI düğüm: tek bir birleşik metin ekran okuyucuya "1 / 2 kilitledi kim
            neyi seçti…" diye tek nefeste okunuyordu — ikisi ayrı bilgi. */}
        <View style={s.status}>
          <AppText variant="num" style={s.count}>
            {t("runoff.votedCount", { done: voted.length, total: voters.length })}
          </AppText>
          <AppText variant="muted" style={s.note}>
            {t("runoff.note")}
          </AppText>
        </View>

        <Attribution providers={attributionProviders(finalists)} />
        <VoiceDockSlot slug={slug} />
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 96 }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        {sent ? (
          <Card tone="grass" style={s.locked}>
            <AppText variant="h3">{t("runoff.lockedTitle")}</AppText>
            <AppText variant="muted">{lockedNote}</AppText>
            <Button
              small
              kind="white"
              title={t("runoff.remind")}
              onPress={() => void remind()}
              icon={<ChatCircleIcon size={16} color={colors.ink} weight="bold" />}
            />
          </Card>
        ) : (
          <Button
            title={t("runoff.lockIn")}
            disabled={!selected || busy}
            onPress={() => void lock()}
          />
        )}
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 130, gap: space.gap },
  status: { gap: 2 },
  count: { color: colors.ink2 },
  note: { fontSize: 12 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  locked: { gap: 6 },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
});
