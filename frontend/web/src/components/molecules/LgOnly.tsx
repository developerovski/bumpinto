import type { ReactNode } from "react";

/** `hidden lg:block` sarmalayıcı — sayfalar (`pages/`) className kullanamaz (INDEX kural),
    bu iki satırlık molekül onun yerine geçer (LobbyPage harita ghost butonu). */
export default function LgOnly({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}
