import type { ReactNode } from "react";

export default function Highlight({ children }: { children: ReactNode }) {
  return <span className="a-hl">{children}</span>;
}
