/* Kaynak: ui.css .a-hl / DS v2 */
import type { ReactNode } from "react";

const cls =
  "inline-block rounded-lg px-2.5 py-px -rotate-[1.2deg] " +
  "bg-[linear-gradient(100deg,rgba(255,226,122,0)_0_1%,var(--color-hl)_4%_96%,rgba(255,226,122,0)_99%)]";

/** `children` isteğe bağlı: <Trans components={[<Highlight key="0" />]}> içeriği
    render anında cloneElement ile enjekte eder. */
export default function Highlight({ children }: { children?: ReactNode }) {
  return <span className={cls}>{children}</span>;
}
