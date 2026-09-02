/* Plan 14 · Karar efekti — beğenide kalp + konfeti, geçte × + dağılan toz. Artboard'da yok; DS renkleri. */
import { Heart, X } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

export type BurstKind = "like" | "pass";

// Deste kartının merkezinden dışa; açı/mesafe sabit (deterministik), renk DS paletinden döner.
const CONFETTI_COLORS = ["bg-sun", "bg-flame", "bg-[#7c4dff]", "bg-grass", "bg-flame2"];
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2) * 0.2;
  const dist = 120 + (i % 3) * 35;
  return {
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist - 50,
    rot: 180 + i * 40,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  };
});
const POOF = Array.from({ length: 8 }, (_, i) => ({
  tx: (i - 3.5) * 22,
  ty: -30 - (i % 3) * 14,
}));

const WRAP = "inset-0 z-4 pointer-events-none animate-burst-life";
const PARTICLE = "absolute left-1/2 top-[42%]";
const BADGE =
  "absolute left-1/2 top-[42%] flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full animate-pop";

function vars(p: { tx: number; ty: number; rot?: number }): CSSProperties {
  return { "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": `${p.rot ?? 0}deg` } as CSSProperties;
}

/** Tek seferlik patlama; kendi ömrü bitince `onDone` ile kaldırılır (VenueDeck). */
export default function DecisionBurst(props: { kind: BurstKind; onDone: () => void }) {
  return (
    <div
      className={WRAP}
      aria-hidden
      onAnimationEnd={(e) => e.target === e.currentTarget && props.onDone()}
    >
      {props.kind === "like" ? (
        <>
          <span className={`${BADGE} bg-[image:var(--grad)] shadow-sh2`}>
            <Heart size={38} weight="fill" className="text-white" />
          </span>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className={`${PARTICLE} h-2.5 w-2.5 animate-confetti ${c.color} ${c.round ? "rounded-full" : "rounded-[0.125rem]"}`}
              style={vars(c)}
            />
          ))}
        </>
      ) : (
        <>
          <span className={`${BADGE} border border-line2 bg-white shadow-sh2`}>
            <X size={38} weight="bold" className="text-ink" />
          </span>
          {POOF.map((p, i) => (
            <span
              key={i}
              className={`${PARTICLE} h-2 w-2 rounded-full bg-ink3 animate-poof`}
              style={vars(p)}
            />
          ))}
        </>
      )}
    </div>
  );
}
