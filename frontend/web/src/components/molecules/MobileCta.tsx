import type { ReactNode } from "react";

/** Artboard 390 `.cta` — sayfa altına yapışan tam genişlik aksiyon (≥1024'te gizli, header CTA'sı kullanılır). */
export default function MobileCta({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-3 lg:hidden">{children}</div>;
}

/** Artboard 1280 sol bölge — masaüstünde görünen aksiyon (mobilde gizli, `.cta` yerini `MobileCta` tutar). */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden lg:flex lg:flex-col lg:gap-3">{children}</div>;
}
