/* Kaynak: ui.css .a-sticker / .a-sticker--white / DS v2 */
import type { ReactNode } from "react";

/* Renk, kenar rengi, gölge ve eğim TONDA: aynı özelliği taşıyan iki utility'yi birlikte basmak
   kazananı sınıf sırasına değil Tailwind'in çıktı sırasına bırakırdı. */
const base =
  "inline-flex items-center gap-1.5 px-[0.8125rem] py-1.5 rounded-xl " +
  "font-head text-[0.78125rem] font-extrabold border-[1.5px]";
const INK = "text-ink border-ink shadow-[2px_3px_0_rgba(39,32,59,0.18)]";
const tones = {
  sun: `${INK} bg-sun -rotate-[2.5deg]`,
  /** Artboard `.stk.w` (183) — beyaz çıkartma; eğimi sarı kardeşinin TERSİ yönde (+1.8°). */
  white: `${INK} bg-white rotate-[1.8deg]`,
  /** Keşfet POC `.stk.now` — SÜREN plan damgası (spec §11.3: amber; "kesin" sarı kalır). */
  amber: "text-amber-ink border-amber-ink bg-amber-wash shadow-[2px_3px_0_rgba(126,79,6,0.2)] -rotate-[1.6deg]",
};

export default function Sticker(props: {
  children: ReactNode;
  white?: boolean;
  amber?: boolean;
}) {
  const tone = props.amber ? tones.amber : props.white ? tones.white : tones.sun;
  return (
    <span className={`${base} ${tone}`}>
      {props.children}
    </span>
  );
}
