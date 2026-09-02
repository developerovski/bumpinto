import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Note, Page } from "../components/atoms";
import RunoffIntro from "../components/molecules/RunoffIntro";
import RunoffStatus from "../components/molecules/RunoffStatus";
import RunoffTie from "../components/molecules/RunoffTie";
import TwoZone from "../components/molecules/TwoZone";
import RunoffList from "../components/organisms/RunoffList";
import { useTravelLabels } from "../lib/useTravelLabels";
import { useDeckStore } from "../store/deckStore";
import { isHost, useSessionStore } from "../store/sessionStore";

/** Kaynak: mobil `07 Runoff` artboard'u, webe birebir uyarlandı
    (durum çubuğu gibi mobil kabuk çıkarıldı, seçim + kilitleme iki kolona ayrıldı). */
export default function RunoffScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const vote = useDeckStore((s) => s.vote);
  const pick = useSessionStore((s) => s.pick);
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
  // Kendi oyu sunucudan gelir; `choice` yalnız HENÜZ gönderilmemiş seçimi tutar. Tersi olsaydı
  // (sadece useState) sayfa yenilenince kişi "kilitli" yazısını görür, neyi kilitlediğini göremezdi.
  const selected = choice ?? props.view.viewer?.runoffVoteVenueId ?? null;

  // Beraberlik = "oy verebilecek herkes oy verdi ama oturum hâlâ RUNOFF". Tek kazanan çıksaydı
  // sunucu DECIDED'a geçerdi (DeckFlow.runoffVote), dolayısıyla bu koşul tam olarak beraberliktir
  // ve ayrı bir alan gerektirmez. Karar host'a geçer; kalan tek çıkış force-decision'dır.
  const voters = (props.view.participants ?? []).filter((p) => p.hasLocation && !p.manual);
  const tie = voters.length > 0 && voters.every((p) => !!p.id && voted.includes(p.id));
  const host = isHost(props.view);
  const hostName = voters.find((p) => p.host)?.displayName ?? "";

  async function decide() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      await pick(selected); // force-decision: RUNOFF'ta yalnız finalistleri kabul eder
    } catch {
      setError(t("runoff.errDecide"));
    } finally {
      setSending(false);
    }
  }

  async function lock() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      await vote(props.slug, selected);
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
            <Note>{tie ? t("runoff.tieNote") : t("runoff.copy")}</Note>
            <RunoffList
              finalists={finalists}
              choice={selected}
              onChoose={setChoice}
              disabled={tie ? !host : sent}
              travelLabels={travelLabels}
            />
          </>
        }
        right={tie ? (
          <RunoffTie
            host={host}
            hostName={hostName}
            choice={selected}
            sending={sending}
            onDecide={() => void decide()}
            error={error}
          />
        ) : (
          <RunoffStatus
            participants={props.view.participants ?? []}
            votedIds={voted}
            choice={selected}
            sent={sent}
            sending={sending}
            onLock={() => void lock()}
            selfId={selfId}
            error={error}
          />
        )}
      />
    </Page>
  );
}
