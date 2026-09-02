/* Kaynak: ui.css .a-ov — küçük harf aralıklı üst başlık ("Kimler var" vb.) */
import type { ReactNode } from "react";

export default function Overline(props: { children: ReactNode }) {
  return (
    <p className="m-0 text-[0.6875rem] font-bold tracking-[0.11em] text-ink3 uppercase">
      {props.children}
    </p>
  );
}
