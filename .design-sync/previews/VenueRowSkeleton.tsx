import type { ReactNode } from "react";
import { VenueRowSkeleton } from "@bumpinto/web";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;
const Col = ({ children }: { children: ReactNode }) => <div style={COL}>{children}</div>;

/** W3e `.sk` · mekan satırı iskeleti: 56×64 görsel kutusu + üç metin şeridi, nabız animasyonu
    (`motion-safe:animate-pulse`). Props almaz — `VenuesLoading` dört tanesini art arda basar. */
export function Row() {
  return (
    <Col>
      <VenueRowSkeleton />
    </Col>
  );
}
