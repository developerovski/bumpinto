/* Kaynak: ui.css .a-deck / .a-pol--d1..d3 (.a-deck > .a-pol konumu) / .a-kbd / .a-mi · jest: plan 14 */
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import type { SwipeDir } from "../../lib/swipeMath";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { useDeckStore } from "../../store/deckStore";
import { HandNote } from "../atoms";
import DeckActions from "../molecules/DeckActions";
import DecisionBurst, { type BurstKind } from "../molecules/DecisionBurst";
import SwipeCard, { type SwipeEnter, type SwipeFrom } from "../molecules/SwipeCard";
import VenueCard from "../molecules/VenueCard";

// ui.css `.a-deck > .a-pol` bir bağlam kuralıydı — çocuk varyantı olarak kapta durur.
// `!absolute`: karttaki taban `relative` ile özgüllük eşit (0,1,0); sıralamayı Tailwind'in
// yayın sırası belirliyor (`.relative`, `.absolute`ten sonra) — kalıcı kısıt, önem şart.
const DECK = "relative h-[27.5rem] flex-none [&>*]:!absolute [&>*]:inset-x-0 [&>*]:mx-auto";
const D1 = "transform-[rotate(-1.6deg)] shadow-sh2";
const D2 = "z-1 h-[25rem] shadow-sh1 animate-promote";
// Sürükleme ilerlemesiyle (`--swipe-p`, SwipeCard.onProgress) d2 d1'in yerine yaklaşır.
const D2_STYLE: CSSProperties = {
  transform:
    "rotate(calc(2.6deg * (1 - var(--swipe-p, 0)))) " +
    "translateY(calc(0.625rem * (1 - var(--swipe-p, 0)))) " +
    "scale(calc(0.97 + 0.03 * var(--swipe-p, 0)))",
  opacity: "calc(0.75 + 0.25 * var(--swipe-p, 0))",
  transition: "transform 0.25s var(--ease-swipe), opacity 0.25s var(--ease-swipe)",
};
const D3 = "z-0 h-[24.375rem] opacity-45 transform-[rotate(-5deg)_translateY(1.25rem)_scale(0.94)] animate-appear";
const FLY = "z-3 pointer-events-none animate-fly-out";

const KBD =
  "inline-flex h-6 min-w-[1.625rem] items-center justify-center rounded-[0.4375rem] " +
  "border-[1.5px] border-line2 bg-white px-[0.4375rem] " +
  "font-[family-name:ui-monospace,Menlo,monospace] text-[0.75rem] text-ink2 " +
  "shadow-[0_2px_0_var(--color-line2)]";

type Flying = { key: number; venue: VenueDto; dir: SwipeDir; from?: SwipeFrom };
type Burst = { key: number; kind: BurstKind };

// app.css reduced-motion kuralı animasyonu kapatır → animationend gelmez; uçan katman atlanır.
function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Artboard W3 · .prog + .deck + aksiyonlar + klavye ipucu. Karar iyimser: `decide()` anında,
    çıkan kart ayrı katmanda uçar; buton, klavye ve jest aynı `commit` yolundan geçer. */
export default function VenueDeck(props: {
  venues: VenueDto[];
  travel?: TravelInfo;
  /** SessionView.activityType — kart anatomisi §4.9 uyum satırı için. */
  activity?: string;
  /** SessionView.midpointLabel — kart anatomisi §4.9 semt satırı için. */
  midpointLabel?: string;
}) {
  const { t } = useTranslation();
  const venues = props.venues;
  // Uyum satırının "destede tek kategori varsa çizilmez" kuralı (§4.6) için TÜM kart kategorileri.
  const categories = useMemo(
    () => venues.map((v) => v.category).filter((c): c is string => !!c),
    [venues],
  );
  const index = useDeckStore((s) => s.index);
  const liked = useDeckStore((s) => s.liked);
  const decide = useDeckStore((s) => s.decide);
  const undo = useDeckStore((s) => s.undo);
  const current = venues[index];
  const next = venues[index + 1];
  const third = venues[index + 2];
  const previous = venues[index - 1];
  const remaining = venues.length - index;
  const likedCount = Object.values(liked).filter(Boolean).length;

  const deck = useRef<HTMLDivElement>(null);
  const flyKey = useRef(0);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [enter, setEnter] = useState<SwipeEnter>(null);

  function setProgress(p: number) {
    deck.current?.style.setProperty("--swipe-p", String(p));
  }

  function commit(dir: SwipeDir, from?: SwipeFrom) {
    if (!current) return;
    if (!reducedMotion()) {
      const key = flyKey.current++;
      setFlying((f) => [...f, { key, venue: current, dir, from }]);
      setBursts((b) => [...b, { key, kind: dir === "right" ? "like" : "pass" }]);
    }
    setEnter(from ? null : "rise");
    setProgress(0);
    void decide(current.id!, dir === "right");
  }

  function undoPrevious() {
    if (!previous) return;
    setEnter(liked[previous.id!] ? "right" : "left");
    void undo(previous.id!);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input,textarea,[contenteditable=true]")) return;
      if (e.key === "ArrowRight") commit("right");
      if (e.key === "ArrowLeft") commit("left");
      if (e.key === "Backspace") undoPrevious();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) return null;
  return (
    <div className="mx-auto w-full max-w-[26.25rem]">
      <div ref={deck} className={DECK}>
        {/* Arka katmanlar artboard'da yalnız fotoğraf alanı gösterir. */}
        {third && <VenueCard key={third.id} venue={third} photoOnly className={D3} />}
        {next && <VenueCard key={next.id} venue={next} photoOnly className={D2} style={D2_STYLE} />}
        <SwipeCard key={current.id} className="z-2" enter={enter} onSwipe={commit} onProgress={setProgress}>
          <VenueCard
            venue={current}
            className={D1}
            travel={props.travel}
            activity={props.activity}
            categories={categories}
            midpointLabel={props.midpointLabel}
          />
        </SwipeCard>
        {flying.map((f) => (
          <div
            key={f.key}
            className={FLY}
            aria-hidden
            style={
              {
                "--fx": `${f.from?.dx ?? 0}px`,
                "--fy": `${f.from?.dy ?? 0}px`,
                "--fr": `${f.from?.rot ?? 0}deg`,
                "--dir": f.dir === "right" ? 1 : -1,
                // Buton/klavye: duran kart tam hızla fırlamasın — yumuşak giriş-çıkış.
                animationTimingFunction: f.from ? undefined : "var(--ease-stack)",
              } as CSSProperties
            }
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) setFlying((list) => list.filter((x) => x.key !== f.key));
            }}
          >
            <VenueCard
              venue={f.venue}
              className={D1}
              travel={props.travel}
              activity={props.activity}
              categories={categories}
              midpointLabel={props.midpointLabel}
            />
          </div>
        ))}
        {bursts.map((b) => (
          <DecisionBurst
            key={b.key}
            kind={b.kind}
            onDone={() => setBursts((list) => list.filter((x) => x.key !== b.key))}
          />
        ))}
      </div>
      <DeckActions
        onUndo={undoPrevious}
        onPass={() => commit("left")}
        onLike={() => commit("right")}
      />
      <div className="mt-3 hidden flex-none items-center justify-center gap-2 lg:flex">
        <span className={KBD}>←</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.pass")}</span>
        <span className="mx-1 text-[0.75rem] text-ink2">·</span>
        <span className={KBD}>→</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.like")}</span>
        <span className="mx-1 text-[0.75rem] text-ink2">·</span>
        <span className={KBD}>⌫</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.undoKey")}</span>
      </div>
      <div className="mt-3 lg:hidden">
        <HandNote center>{t("deck.swipeHand")}</HandNote>
      </div>
      {/* Kalan kart ≤ 2 ve hiç beğeni yoksa TEK kalibrasyon notu (§5.C "Deste"). */}
      {remaining <= 2 && likedCount === 0 && (
        <div className="mt-3">
          <HandNote center>{t("deck.calibrateHand")}</HandNote>
        </div>
      )}
    </div>
  );
}
