import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { fairestOf } from "@bumpinto/shared";
import { Note, Page } from "../components/atoms";
import RunoffIntro from "../components/molecules/RunoffIntro";
import RunoffStatus from "../components/molecules/RunoffStatus";
import RunoffTie from "../components/molecules/RunoffTie";
import TwoZone from "../components/molecules/TwoZone";
import RunoffList from "../components/organisms/RunoffList";
import { useTravelLabels } from "../lib/useTravelLabels";
import { allVoted, votersOf } from "../lib/voters";
import { useDeckStore } from "../store/deckStore";
import { isHost, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Kaynak: mobil `07 Runoff` artboard'u, webe birebir uyarlandı
    (durum çubuğu gibi mobil kabuk çıkarıldı, seçim + kilitleme iki kolona ayrıldı). */
export default function RunoffScreen(props: { slug: string; view: SessionView }) {
  const { t } = useTranslation();
  const vote = useDeckStore((s) => s.vote);
  const pick = useSessionStore((s) => s.pick);
  const v = props.view;
  const selfId = v.viewer?.participantId;
  const [choice, setChoice] = useState<string | null>(null);
  const [localSent, setLocalSent] = useState(false);
  const { run, busy, error } = useSessionAction();

  const finalists = useMemo(
    () => (v.venues ?? []).filter((venue) => v.runoffVenueIds?.includes(venue.id!)),
    [v.venues, v.runoffVenueIds],
  );
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 34′ · Ayşe 28′" diyor.
  const travel = useTravelLabels(props.view);

  const voted = v.runoffVotedParticipantIds ?? [];
  const sent = localSent || (!!selfId && voted.includes(selfId));
  // Kendi oyu sunucudan gelir; `choice` yalnız HENÜZ gönderilmemiş seçimi tutar. Tersi olsaydı
  // (sadece useState) sayfa yenilenince kişi "kilitli" yazısını görür, neyi kilitlediğini göremezdi.
  const selected = choice ?? v.viewer?.runoffVoteVenueId ?? null;

  // Beraberlik = "oy verebilecek herkes oy verdi ama oturum hâlâ RUNOFF". Tek kazanan çıksaydı
  // sunucu DECIDED'a geçerdi (DeckFlow.runoffVote), dolayısıyla bu koşul tam olarak beraberliktir
  // ve ayrı bir alan gerektirmez. Karar host'a geçer; kalan tek çıkış force-decision'dır.
  const voters = votersOf(v.participants ?? []);
  const tie = allVoted(voters, voted);
  const host = isHost(props.view);
  const hostName = voters.find((p) => p.host)?.displayName ?? "";
  // Sunucu-kapılı sayım: voteTally yalnız herkes kilitleyince ya da DECIDED'da dolu gelir (B-7:T2).
  // Yalnız RunoffTie'de gösterilir — `tie` ile aynı oy kümesini kullandığından RunoffStatus'un
  // sent dalına bu veriyle hiç ulaşılmaz (code-review bulgusu, bkz. RunoffStatus.tsx).
  const tally = v.voteTally && Object.keys(v.voteTally).length > 0 ? v.voteTally : undefined;

  const shareUrl = `${location.origin}/j/${v.slug ?? ""}`;
  const shareText = t("runoff.remindText");

  function decide() {
    if (!selected) return;
    // force-decision: RUNOFF'ta yalnız finalistleri kabul eder
    void run(() => pick(selected), "runoff.errDecide");
  }

  // Beraberlikte host'un ikinci çıkışı: en adil finalisti (min fark → min toplam → puan → id,
  // fairestOf @bumpinto/shared) istemcide seçip mevcut force-decision ile gönder — B-7'de ayrı
  // bir uç yok.
  function decideFair() {
    const target = fairestOf(finalists);
    if (!target?.id) return;
    void run(() => pick(target.id!), "runoff.errDecide");
  }

  function lock() {
    if (!selected) return;
    void run(async () => {
      await vote(props.slug, selected);
      setLocalSent(true);
    }, "runoff.errVote");
  }

  return (
    <Page>
      <TwoZone
        left={
          <>
            <RunoffIntro
              activity={v.activityType ?? ""}
              people={voters.length}
              finalists={finalists.length}
              reason={v.runoffReason}
              sent={sent}
            />
            {/* Beraberlik durumu, "neden runoff" kopyasına EK bir durum notudur — reason kopyası
                RunoffIntro içinde zaten görünür. */}
            {tie && <Note>{t("runoff.tieNote")}</Note>}
            <RunoffList
              finalists={finalists}
              choice={selected}
              onChoose={setChoice}
              disabled={tie ? !host : sent}
              travel={travel}
            />
          </>
        }
        right={tie ? (
          <RunoffTie
            host={host}
            hostName={hostName}
            choice={selected}
            sending={busy}
            onDecide={decide}
            onFair={decideFair}
            error={error}
            tally={tally}
            finalists={finalists}
          />
        ) : (
          <RunoffStatus
            participants={v.participants ?? []}
            votedIds={voted}
            choice={selected}
            sent={sent}
            sending={busy}
            onLock={lock}
            selfId={selfId}
            error={error}
            shareText={shareText}
            shareUrl={shareUrl}
          />
        )}
      />
    </Page>
  );
}
