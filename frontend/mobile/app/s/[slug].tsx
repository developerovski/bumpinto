import type { SessionView } from "@bumpinto/shared";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Skeleton } from "../../src/components/atoms";
import VoiceDock from "../../src/components/organisms/VoiceDock";
import DeckScreen from "../../src/screens/DeckScreen";
import ErrorScreen from "../../src/screens/ErrorScreen";
import LobbyScreen from "../../src/screens/LobbyScreen";
import ResultScreen from "../../src/screens/ResultScreen";
import RunoffScreen from "../../src/screens/RunoffScreen";
import SentScreen from "../../src/screens/SentScreen";
import SoloSetupScreen from "../../src/screens/SoloSetupScreen";
import TieScreen from "../../src/screens/TieScreen";
import VenuesScreen from "../../src/screens/VenuesScreen";
import WaitingScreen from "../../src/screens/WaitingScreen";
import { useSessionLive } from "../../src/store/useSessionLive";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, space } from "../../src/theme";

export default function SessionRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  useSessionLive(slug);

  const view = useSessionStore((s) => s.view);
  const error = useSessionStore((s) => s.error);

  // Hata görünümden ÖNCE gelir: bayat bir `view` üstünde "süresi doldu" yazmaktansa
  // kullanıcıyı çıkışı olan bir ekrana koy.
  if (error) return <ErrorScreen kind={error === "session.expired" ? "expired" : "notFound"} />;
  if (!view) return <LoadingShell />;

  /* Dock ekranın KARDEŞİ: her ekran kendi `ScrollView`ini kuruyor ve dock oraya girerse
     mutlak konumu kaydırma içeriğine tutunup listenin dibine düşer (2026-09-09 emülatörde).
     Burada bir kez mount edilir — mesh ekran geçişlerinde de ayakta kalır (spec §7). */
  return (
    <View style={s.host}>
      {screenFor(view)}
      <VoiceDock view={view} />
    </View>
  );
}

function screenFor(view: SessionView) {
  const host = view.viewer?.host === true;
  const solo = view.sessionType === "SOLO";

  switch (view.status) {
    case "COLLECTING":
    case "SUGGESTING":
      // SOLO'da davet linki HİÇ çalışmaz: host lobiyi değil nokta editörünü görür.
      if (solo) return <SoloSetupScreen view={view} />;
      return host ? <LobbyScreen view={view} /> : <WaitingScreen view={view} />;
    case "BROWSING":
      return <VenuesScreen view={view} />;
    case "SWIPING":
      // Desteyi bitiren kişi "gönderildi" ekranında bekler; kalanlar kaydırmaya devam eder.
      return viewerOf(view)?.deckDone ? <SentScreen view={view} /> : <DeckScreen view={view} />;
    case "RUNOFF":
      // Berabere kaldıysa host'a karar ekranı, diğerlerine oylama düşer.
      return (view.runoffVenueIds ?? []).length === 0 && !view.decidedVenueId && host ? (
        <TieScreen view={view} />
      ) : (
        <RunoffScreen view={view} />
      );
    case "DECIDED":
      // Karar verilen mekan destede yoksa sonuç çizilemez — uydurma bir kart basılmaz.
      return (view.venues ?? []).some((v) => v.id === view.decidedVenueId) ? (
        <ResultScreen view={view} />
      ) : (
        <ErrorScreen kind="expired" />
      );
    default:
      return <ErrorScreen kind="expired" />;
  }
}

/** Görüntüleyenin katılımcı kaydı — `viewer.participantId` ile eşleşen satır. */
function viewerOf(view: SessionView) {
  const id = view.viewer?.participantId;
  return id ? (view.participants ?? []).find((p) => p.id === id) : undefined;
}

/** İlk yükleme: hata DEĞİL, boş da değil — kağıt üstünde iki kart iskeleti. */
function LoadingShell() {
  return (
    <View style={s.shell}>
      <Skeleton height={26} width="60%" />
      <Skeleton height={90} radius={22} />
      <Skeleton height={120} radius={22} />
    </View>
  );
}

const s = StyleSheet.create({
  host: { flex: 1 },
  shell: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: space.screenX,
    paddingTop: 60,
    gap: space.gap,
  },
});
