/* Kaynak: ui.css .a-badge* / DS v2 */
import type { ReactNode } from "react";

const tones = {
  flame: "bg-flame-wash text-flame-ink",
  grass: "bg-grass-wash text-grass",
  amber: "bg-amber-wash text-amber-ink",
  violet: "bg-violet-wash text-violet",
  neutral: "bg-sand text-ink2",
};

export default function Badge(props: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full " +
        "px-[0.6875rem] py-[0.28125rem] text-[0.75rem] font-bold " + tones[props.tone ?? "neutral"]
      }
    >
      {props.children}
    </span>
  );
}
