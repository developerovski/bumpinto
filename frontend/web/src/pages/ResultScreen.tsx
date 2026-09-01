import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Page, Wordmark } from "../components/atoms";
import Confetti from "../components/molecules/Confetti";
import ViralCard from "../components/molecules/ViralCard";
import WinnerCard from "../components/molecules/WinnerCard";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W4 · Sonuç — viral döngü. */
export default function ResultScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const winner = (view.venues ?? []).find((v) => v.id === view.decidedVenueId);
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı (artboard W3 rozet metni).
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of view.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === self?.id ? t("deck.travelSelf") : (p.displayName ?? t("deck.travelFriend"));
    }
    return labels;
  }, [view.participants, self?.id, t]);

  if (!winner) return null;

  return (
    <Page variant="result">
      <Confetti />
      <Wordmark />
      <WinnerCard venue={winner} travelLabels={travelLabels} />
      <ViralCard />
    </Page>
  );
}
