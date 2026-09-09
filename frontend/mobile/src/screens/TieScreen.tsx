import { attributionProviders, fairestOf, votersOf, type SessionView } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Button, HandNote } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import BottomSheet from "../components/organisms/BottomSheet";
import RunoffCard from "../components/organisms/RunoffCard";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P19 — beraberlik. Herkes oy verdi, tek kazanan çıkmadı; oturum RUNOFF'ta asılı
 * kalmasın diye son sözü HOST söyler.
 *
 * Host'a İKİ çıkış verilir: "adil olana bırak" (`fairestOf`, shared — kimse tartışmaz) ve
 * "kararı ben vereyim" (elle seçim). İkisi de AYNI uca gider (`forceDecision`); B-7'de ayrı
 * bir "beraberliği çöz" ucu yok, uydurulmadı.
 *
 * Davetli hiçbir düğme GÖRMEZ: karar onda değil. Yerine kimin karar verdiği söylenir —
 * boş bir ekranda beklemek "uygulama dondu" hissi verir.
 */
export default function TieScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);
  const loadView = useSessionStore((s) => s.loadView);

  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = view.slug ?? "";
  const host = view.viewer?.host === true;
  const venues = view.venues ?? [];
  const finalists = venues.filter((v) => v.id && view.runoffVenueIds?.includes(v.id));
  const fairest = fairestOf(finalists);
  const hostName = votersOf(view.participants ?? []).find((p) => p.host)?.displayName ?? "";

  async function decide(venueId?: string) {
    if (!venueId) return;
    setBusy(true);
    setError(null);
    try {
      await api.forceDecision(slug, { venueId });
      setPicking(false);
      await loadView(slug);
    } catch {
      setError("runoff.errDecide");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="over">{t("runoff.tieOverline")}</AppText>
        <AppText variant="h1">{t("runoff.tieTitle")}</AppText>
        <AppText variant="muted">
          {host ? t("runoff.tieHostCopy") : t("runoff.tieGuestCopy", { host: hostName })}
        </AppText>

        <AppText variant="over" style={s.tally}>
          {t("runoff.tallyTitle")}
        </AppText>

        {finalists.map((venue) => (
          <View key={venue.id} style={s.finalist}>
            <RunoffCard
              venue={venue}
              travel={travel}
              selected={false}
              deciding={false}
              votes={view.voteTally?.[venue.id!] ?? 0}
              midpointLabel={view.midpointLabel}
            />
            {/* Host'un "adil olana bırak" düğmesinin HANGİ yeri seçeceği önceden görünür —
                sonucu görünmeyen bir düğme güven vermez. */}
            {fairest?.id === venue.id ? (
              <Badge tone="grass" style={s.fairBadge}>
                {t("runoff.tieNote")}
              </Badge>
            ) : null}
          </View>
        ))}

        {host ? <HandNote style={s.hand}>{t("runoff.tieHand")}</HandNote> : null}

        <Attribution providers={attributionProviders(finalists)} />
        <VoiceDockSlot slug={slug} />
      </ScrollView>

      {host ? (
        <>
          <LinearGradient
            colors={["rgba(255,251,246,0)", colors.paper]}
            style={[s.fade, { bottom: insets.bottom + 110 }]}
            pointerEvents="none"
          />
          <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
            <Button
              title={t("runoff.tieFair")}
              disabled={busy || !fairest?.id}
              onPress={() => void decide(fairest?.id)}
            />
            <Button
              kind="white"
              small
              title={t("runoff.tieDecide")}
              disabled={busy}
              onPress={() => setPicking(true)}
            />
            {error ? (
              <AppText variant="muted" style={s.error}>
                {t(error)}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}

      <BottomSheet
        visible={picking}
        onClose={() => setPicking(false)}
        closeLabel={t("venues.cancel")}
      >
        <AppText variant="h2" style={s.sheetTitle}>
          {t("venues.selectionTitle")}
        </AppText>
        {finalists.map((venue) => (
          <Button
            key={venue.id}
            kind="white"
            title={venue.name ?? ""}
            disabled={busy}
            onPress={() => void decide(venue.id)}
            style={s.sheetPick}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 140, gap: space.gap },
  tally: { paddingTop: 4 },
  finalist: { gap: 6 },
  fairBadge: { alignSelf: "flex-start" },
  hand: { alignSelf: "center" },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
  sheetTitle: { paddingBottom: 4 },
  sheetPick: { marginTop: 8 },
});
