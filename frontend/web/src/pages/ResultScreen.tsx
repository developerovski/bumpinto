import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fairnessOf, type SessionView } from "@bumpinto/shared";
import { HandNote, LinkButton, Page } from "../components/atoms";
import BackupPlan from "../components/molecules/BackupPlan";
import Confetti from "../components/molecules/Confetti";
import MobileCta from "../components/molecules/MobileCta";
import ResultActions from "../components/molecules/ResultActions";
import SessionHeader from "../components/molecules/SessionHeader";
import ShareButton from "../components/molecules/ShareButton";
import TravelBars from "../components/molecules/TravelBars";
import TwoZone from "../components/molecules/TwoZone";
import ViralCard from "../components/molecules/ViralCard";
import WhyHere from "../components/molecules/WhyHere";
import WinnerCard from "../components/molecules/WinnerCard";
import { claimReveal } from "../lib/reveal";
import { useTravelLabels } from "../lib/useTravelLabels";
import { venueLink } from "../lib/venueLink";
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

/** Artboard Karar 1280 (2515–2598) / 390 (2599–2666) · Sonuç. Bölge dağılımı artboard'dan:
    SOL = üstlük/başlık/meta → `.rc` kartı → "Neden burası?" → aksiyon şeridi → yedek plan;
    SAĞ = "Herkesin yolu" çubukları → el yazısı not → viral kart (rapor I · P1-4, P2-9).
    390'da tek sütuna düşer; orada `.tb` kartı ve yedek plan gizli (`.rc-ppl` aynı dakikaları
    zaten taşır — P1-B2, P2-B5) ve "Yol tarifi al" ekranın dibine yapışır (P1-B1).
    Harita YOK (§4.7) — Karar ekranında harita bileşeni hiç mount edilmez. */
export default function ResultScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const v = view;
  const winner = (v.venues ?? []).find((venue) => venue.id === v.decidedVenueId);
  const participants = v.participants ?? [];
  const isHost = !!v.viewer?.host;
  // travel[] katılımcı UUID'siyle anahtarlı (artboard W3 rozet metni).
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
  const href = venueLink(winner);

  // El yazısı notu (artboard 2586) artık sağ bölgede, `.tb` kartının ALTINDA — `WhyHere` kartının
  // içinde değil. Kural aynen korunur: yalnız fark ≥ 10 dk VE adlandırılabilir bir kişi varken
  // (isim yoksa "{{name}} en uzaktan geliyor" boş öznesiyle basılmaz).
  const fairness = fairnessOf(winner);
  const longestName = fairness ? (travel.labels[fairness.longestId] ?? "") : "";
  const handNote =
    fairness && fairness.spread >= 10 && longestName
      ? t("result.leaveEarlyHand", { name: longestName, min: fairness.spread })
      : null;

  return (
    <Page variant="result">
      {reveal && <Confetti />}
      {/* Artboard 2611: 390'ın ilk satırı oturum adı + paylaş. 1280'de başlık `h1` olduğu için
          bu satır yok; metin paylaşımı da yalnız burada yaşar (rapor I · P2-B1). */}
      <div className="lg:hidden">
        <SessionHeader
          title={v.name}
          action={<ShareButton text={shareText} url={shareUrl} size="sm" />}
        />
      </div>
      <TwoZone
        left={
          <>
            <WinnerCard
              venue={winner}
              travel={travel}
              participants={participants}
              decisionKind={v.decisionKind}
              decidedAt={v.decidedAt}
              midpoint={v.midpoint}
              midpointLabel={v.midpointLabel}
              likeCount={likeCount}
              voterCount={voterCount}
              tally={tally}
              names={names}
            />
            <WhyHere view={v} venue={winner} labels={travel.labels} />
            <ResultActions view={v} venue={winner} shareText={shareText} shareUrl={shareUrl} />
            {/* 390 artboard'ında yedek plan satırı YOK (2599–2666). */}
            <div className="hidden lg:block">
              <BackupPlan view={v} winnerId={winner.id ?? ""} />
            </div>
          </>
        }
        right={
          <>
            {/* 390'da `.rc-ppl` aynı dakikaları taşıyor — çubuk kartı yalnız ≥1024'te. */}
            <div className="hidden rounded-card border border-line bg-card p-[1rem_1.125rem] shadow-sh1 lg:block">
              <TravelBars venue={winner} travel={travel} title={t("travel.bars")} />
            </div>
            {handNote && (
              <div className="mt-3.5 mx-1">
                <HandNote>{handNote}</HandNote>
              </div>
            )}
            <ViralCard host={isHost} />
          </>
        }
      />
      {href && (
        <MobileCta>
          <LinkButton href={href} target="_blank" rel="noreferrer" kind="flame">
            {t("result.directions")}
          </LinkButton>
        </MobileCta>
      )}
    </Page>
  );
}
