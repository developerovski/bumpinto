import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Page } from "../components/atoms";
import BackupPlan from "../components/molecules/BackupPlan";
import Confetti from "../components/molecules/Confetti";
import ShareButton from "../components/molecules/ShareButton";
import TravelList from "../components/molecules/TravelList";
import TwoZone from "../components/molecules/TwoZone";
import ViralCard from "../components/molecules/ViralCard";
import WhyHere from "../components/molecules/WhyHere";
import WinnerCard from "../components/molecules/WinnerCard";
import { GROUP_TINT, groupOf, sessionActivities } from "../lib/activity";
import { claimReveal } from "../lib/reveal";
import { useTravelLabels } from "../lib/useTravelLabels";
import { votersOf } from "../lib/voters";

/** Karardan önce bitirmemiş kişi(ler): PARTIAL eyebrow'u için, ada ek almadan. `Intl.ListFormat`
    ≤2 kişide "Ayşe ve Kerem"; 3+'te tek ad + genel "ve diğerleri" (§4.8 — çoklu geciken isim
    isim sayılmaz). İsimsiz (boş `displayName`) katılımcılar `Intl.ListFormat`e girmeden
    süzülür; hiç geçerli isim kalmazsa `undefined` — WinnerCard bunu varsayılan "Ortak nokta"
    başlığına düşürür (code-review düzeltmesi: önceden boş dizeyle "olmadan" tek başına basılıyordu). */
function partialNames(
  participants: SessionView["participants"],
  locale: string,
  moreLabel: (name: string) => string,
): string | undefined {
  const names = votersOf(participants ?? [])
    .filter((p) => !p.deckDone)
    .map((p) => p.displayName)
    .filter((n): n is string => !!n && n.trim() !== "");
  if (names.length === 0) return undefined;
  if (names.length <= 2) return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
  return moreLabel(names[0]);
}

/** Artboard Karar 1280 · Sonuç — kazanan mekan + "neden burası" + herkesin yolu + yedek plan.
    Harita YOK (§4.7) — Karar ekranında harita bileşeni hiç mount edilmez. */
export default function ResultScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const v = view;
  const winner = (v.venues ?? []).find((venue) => venue.id === v.decidedVenueId);
  const participants = v.participants ?? [];
  const selfId = v.viewer?.participantId;
  const isHost = !!v.viewer?.host;
  // Tint KAZANANIN kendi alanından: karışık destede oturumun ilk alanı yanlış renk verirdi.
  const tint = GROUP_TINT[groupOf(winner?.activityType ?? sessionActivities(v)[0] ?? "")];
  // travelMinutes katılımcı UUID'siyle anahtarlı (artboard W3 rozet metni).
  const travel = useTravelLabels(view);

  // `useMemo` render sırasında sessionStorage'a yazıyordu — React 18 StrictMode dev'de render
  // (ve dolayısıyla bu yan etki) iki kez çalışır, ikinci çağrı `claimReveal`i kendi kendine
  // geçersiz kılıp `false` döndürür. Efekte taşınır; `claimedRef` StrictMode'un efekt
  // mount→unmount→mount döngüsünde AYNI anahtar için ikinci `claimReveal` çağrısını engeller
  // (coordinator düzeltmesi).
  const [reveal, setReveal] = useState(false);
  const claimedRef = useRef<string | null>(null);
  useEffect(() => {
    if (v.status !== "DECIDED" || !v.decidedVenueId || !winner) return;
    const key = `${v.slug ?? ""}:${v.decidedVenueId}`;
    if (claimedRef.current === key) return;
    claimedRef.current = key;
    if (claimReveal(v.slug ?? "", v.decidedVenueId)) setReveal(true);
  }, [v.slug, v.decidedVenueId, v.status, winner]);

  if (!winner) return null;

  const tally =
    v.decisionKind === "RUNOFF" && v.voteTally && winner.id
      ? {
          top: v.voteTally[winner.id] ?? 0,
          second: Math.max(
            0,
            ...Object.entries(v.voteTally)
              .filter(([id]) => id !== winner.id)
              .map(([, n]) => n),
          ),
        }
      : undefined;
  const names =
    v.decisionKind === "PARTIAL"
      ? partialNames(v.participants, i18n.resolvedLanguage ?? i18n.language, (name) =>
          t("result.partialOthers", { name }),
        )
      : undefined;
  const voterCount = votersOf(participants).length;
  const likeCount = winner.id ? v.likeCounts?.[winner.id] : undefined;

  const shareText = t("result.shareText", { name: v.name ?? "", venue: winner.name ?? "" });
  const shareUrl = `${location.origin}${location.pathname}`;

  return (
    <Page variant="result">
      {reveal && <Confetti />}
      <TwoZone
        left={
          <>
            <WinnerCard
              venue={winner}
              travel={travel}
              decisionKind={v.decisionKind}
              decidedAt={v.decidedAt}
              midpoint={v.midpoint}
              likeCount={likeCount}
              voterCount={voterCount}
              tally={tally}
              names={names}
            />
            <ShareButton text={shareText} url={shareUrl} />
          </>
        }
        right={
          <>
            <WhyHere view={v} venue={winner} labels={travel.labels} />
            <TravelList venue={winner} participants={participants} selfId={selfId} />
            <BackupPlan view={v} winnerId={winner.id ?? ""} tint={tint} />
            <ViralCard host={isHost} />
          </>
        }
      />
    </Page>
  );
}
