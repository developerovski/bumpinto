/* Kaynak: artboard Landing `.bd.m2` — 390'da 16px/30ch, 1280'de 17px/40ch, ink2. */
import type { ReactNode } from "react";

export default function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[30ch] text-base leading-[1.5] text-ink2 lg:max-w-[40ch] lg:text-[1.0625rem]">
      {children}
    </p>
  );
}
