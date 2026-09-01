/* Kaynak: ui.css .a-hand / DS v2 */
import type { ReactNode } from "react";

export default function HandNote(props: { children: ReactNode; center?: boolean }) {
  return (
    <p
      className={`font-hand text-[1.1875rem] font-semibold text-ink2 -rotate-[1.5deg]${
        props.center ? " text-center" : ""
      }`}
    >
      {props.children}
    </p>
  );
}
