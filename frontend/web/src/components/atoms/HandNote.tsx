/* Kaynak: ui.css .a-hand / DS v2 */
import type { ReactNode } from "react";

export default function HandNote(props: {
  children: ReactNode;
  center?: boolean;
  /** `sm` — artboard Karar 1280 `.hand` satır içi ezmesi: 390'da 20px, 1280'de 18px. */
  size?: "md" | "sm";
}) {
  return (
    <p
      /* Artboard 619 / 665 / 788: `.hand` her üç yerde de `rotate(-2deg)`. */
      className={`font-hand text-[1.25rem] font-semibold text-ink2 -rotate-2${props.size === "sm" ? " lg:text-[1.125rem]" : ""}${
        props.center ? " text-center" : ""
      }`}
    >
      {props.children}
    </p>
  );
}
