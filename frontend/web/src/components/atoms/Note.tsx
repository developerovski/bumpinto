/* Kaynak: ui.css .muted / DS v2 */
import type { ReactNode } from "react";

export default function Note(props: { center?: boolean; card?: boolean; children: ReactNode }) {
  return (
    <p
      className={`text-[0.8125rem] leading-normal text-ink2${props.center ? " text-center" : ""}${
        props.card ? " rounded-2xl border border-line bg-card p-[1rem_1.125rem]" : ""
      }`}
    >
      {props.children}
    </p>
  );
}
