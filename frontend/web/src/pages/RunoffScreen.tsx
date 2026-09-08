import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { fairestOf } from "@bumpinto/shared";
import { HandNote, Page } from "../components/atoms";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import RunoffIntro from "../components/molecules/RunoffIntro";
import RunoffStatus, { RunoffLockCard } from "../components/molecules/RunoffStatus";
import RunoffTie from "../components/molecules/RunoffTie";
import SessionHeader from "../components/molecules/SessionHeader";
import ShareButton from "../components/molecules/ShareButton";
import TwoZone from "../components/molecules/TwoZone";
import RunoffList from "../components/organisms/RunoffList";
import { sessionActivities } from "../lib/activity";
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
  const activities = sessionActivities(v);
  const [choice, setChoice] = useState<string | null>(null);
  const [localSent, setLocalSent] = useState(false);
  const { run, busy, error } = useSessionAction();

  const finalists = useMemo(
    () => (v.venues ?? []).filter((venue) => v.runoffVenueIds?.includes(venue.id!)),
    [v.venues, v.runoffVenueIds],
  );
  // travel[] katılımcı UUID'siyle anahtarlı; artboard "Sen 34′ · Ayşe 28′" diyor.
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
  // Sunucu-kapılı sayım: voteTally yalnız herkes kilitleyince ya da DECIDED'da dolu gelir (B-7:T2),
  // yani pratikte YALNIZ beraberlikte. Artboard 4368/4383'te sayı ayrı bir liste değil, finalist
  // kartının başlık satırındaki "N oy" rozetidir — RunoffList'e geçer.
  const tally = v.voteTally && Object.keys(v.voteTally).length > 0 ? v.voteTally : undefined;
  // Kalan kişi sayısı kilit kartının notunu belirler (§4.8: tam 1 kişiyse ADLI ve olumlu).
  // Kart 1280'de RunoffStatus içinde, 390'da yapışkan CTA'da basılır — not iki yerde de aynı.
  const waiting = voters.filter((p) => !voted.includes(p.id!));
  const lockedNote =
    waiting.length === 1
      ? t("runoff.lockedCopyName", { name: waiting[0].displayName ?? "" })
      : t("runoff.lockedCopy");

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
      {/* Artboard 4351-4353 — beraberlik 390'ının ilk satırı oturum adı. Yalnız beraberlikte:
          Runoff 390 (2453) bu satırı taşımıyor, orada üstlük doğrudan manşetle başlıyor.
          Tasarımın sağdaki `ph-dots-three` düğmesinin bu ekranda karşılığı yok (taşma menüsü
          diye bir yetenek yok) — uydurulmadı, satır aksiyonsuz basılıyor. */}
      {tie && v.name && (
        <div className="lg:hidden">
          <SessionHeader title={v.name} />
        </div>
      )}
      <TwoZone
        left={
          <>
            <RunoffIntro
              activities={activities}
              people={voters.length}
              finalists={finalists.length}
              reason={v.runoffReason}
              sent={sent}
              tie={tie}
              host={host}
              hostName={hostName}
            />
            <RunoffList
              finalists={finalists}
              choice={selected}
              onChoose={setChoice}
              disabled={tie ? !host : sent}
              travel={travel}
              mixedDeck={activities.length > 1}
              tie={tie}
              tally={tally}
            />
            {/* Artboard 4392/4450 — el yazısı dürtü kartların ALTINDA, CTA'nın üstünde; iki
                kırılma noktasında da akışın içinde. */}
            {tie && host && <HandNote>{t("runoff.tieHand")}</HandNote>}
            {/* 1280'de karar butonları sol bölgede yan yana (4452-4453); 390'daki ikizleri
                aşağıdaki yapışkan CTA'da. İkisi aynı anda GÖRÜNMEZ (lg kapısı), yalnız DOM'da
                iki kez bulunur — RunoffList'in iki kırılma noktalı listesiyle aynı desen. */}
            {tie && (
              <DesktopOnly>
                <RunoffTie
                  host={host}
                  choice={selected}
                  sending={busy}
                  onDecide={decide}
                  onFair={decideFair}
                  error={error}
                  layout="row"
                />
              </DesktopOnly>
            )}
          </>
        }
        right={
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
            tie={tie}
          />
        }
      />
      {/* Artboard 390 `.cta` — aksiyonlar sayfanın dibine yapışır: beraberlikte host'un iki
          çıkışı (4398-4402), kendi seçimin kilitliyken kilit kartı + hatırlatma (2497-2513). */}
      {tie ? (
        host && (
          <MobileCta>
            <RunoffTie
              host={host}
              choice={selected}
              sending={busy}
              onDecide={decide}
              onFair={decideFair}
              error={error}
            />
          </MobileCta>
        )
      ) : sent ? (
        <MobileCta>
          <RunoffLockCard title={t("runoff.lockedTitle")} note={lockedNote} />
          <ShareButton text={shareText} url={shareUrl} label={t("runoff.remind")} kind="white" />
        </MobileCta>
      ) : null}
    </Page>
  );
}
