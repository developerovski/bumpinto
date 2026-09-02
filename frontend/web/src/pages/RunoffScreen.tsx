import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Note, Page } from "../components/atoms";
import RunoffIntro from "../components/molecules/RunoffIntro";
import RunoffStatus from "../components/molecules/RunoffStatus";
import TwoZone from "../components/molecules/TwoZone";
import RunoffList from "../components/organisms/RunoffList";
import { useTravelLabels } from "../lib/useTravelLabels";
import { useDeckStore } from "../store/deckStore";

/** Kaynak: mobil `07 Runoff` artboard'u, webe birebir uyarlandı
    (durum çubuğu gibi mobil kabuk çıkarıldı, seçim + kilitleme iki kolona ayrıldı). */
export default function RunoffScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const vote = useDeckStore((s) => s.vote);
  const selfId = props.view.viewer?.participantId;
  const [choice, setChoice] = useState<string | null>(null);
  const [localSent, setLocalSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalists = useMemo(
    () => (props.view.venues ?? []).filter((v) => props.view.runoffVenueIds?.includes(v.id!)),
    [props.view.venues, props.view.runoffVenueIds],
  );
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 34′ · Ayşe 28′" diyor.
  const travelLabels = useTravelLabels(props.view);

  const voted = props.view.runoffVotedParticipantIds ?? [];
  const sent = localSent || (!!selfId && voted.includes(selfId));

  async function lock() {
    if (!choice) return;
    setSending(true);
    setError(null);
    try {
      await vote(props.slug, choice);
      setLocalSent(true);
    } catch {
      setError(t("runoff.errVote"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Page>
      <TwoZone
        left={
          <>
            <RunoffIntro />
            <Note>{t("runoff.copy")}</Note>
            <RunoffList
              finalists={finalists}
              choice={choice}
              onChoose={setChoice}
              disabled={sent}
              travelLabels={travelLabels}
            />
          </>
        }
        right={
          <RunoffStatus
            participants={props.view.participants ?? []}
            votedIds={voted}
            choice={choice}
            sent={sent}
            sending={sending}
            onLock={() => void lock()}
            selfId={selfId}
            error={error}
          />
        }
      />
    </Page>
  );
}
