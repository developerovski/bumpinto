/* Kaynak: ui.css .err / DS v2 */
import type { ReactNode } from "react";

export default function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[0.8125rem] text-[#c0392b]">
      {children}
    </p>
  );
}
