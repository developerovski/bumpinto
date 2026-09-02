/* Kaynak: ui.css .a-sticker / .a-sticker--white / DS v2 */
import type { ReactNode } from "react";

const base =
  "inline-flex items-center gap-1.5 px-[0.8125rem] py-1.5 rounded-xl " +
  "font-head text-[0.78125rem] font-extrabold text-ink " +
  "border-[1.5px] border-ink shadow-[2px_3px_0_rgba(39,32,59,0.18)]";

export default function Sticker(props: {
  children: ReactNode;
  /** Artboard .stk.w — beyaz çıkartma (W4 viral blok). */
  white?: boolean;
}) {
  return (
    <span
      className={`${base} ${props.white ? "bg-white -rotate-[1.5deg]" : "bg-sun -rotate-[2.5deg]"}`}
    >
      {props.children}
    </span>
  );
}
