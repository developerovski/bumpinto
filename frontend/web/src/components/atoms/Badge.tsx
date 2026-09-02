/* Kaynak: ui.css .a-badge* (+ .a-row-travel > .a-badge ezmesi) / DS v2 */
import type { ReactNode } from "react";

const tones = {
  flame: "bg-flame-wash text-flame-deep",
  grass: "bg-grass-wash text-grass",
  amber: "bg-amber-wash text-amber",
  violet: "bg-violet-wash text-violet",
  neutral: "bg-sand text-ink2",
};

/** `sm` = ui.css `.a-row-travel > .a-badge` (11px) — 07 Runoff satır kartı. */
const sizes = { md: "text-[0.75rem]", sm: "text-[0.6875rem]" };

export default function Badge(props: {
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full " +
        "px-[0.6875rem] py-[0.28125rem] font-bold " +
        sizes[props.size ?? "md"] +
        " " +
        tones[props.tone ?? "neutral"]
      }
    >
      {props.children}
    </span>
  );
}
