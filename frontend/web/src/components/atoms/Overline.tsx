/* Kaynak: ui.css .a-ov — küçük harf aralıklı üst başlık ("Kimler var" vb.) */
import type { ReactNode } from "react";

export default function Overline(props: { children: ReactNode; tone?: "flame" }) {
  return (
    <p
      className={`m-0 text-[0.6875rem] font-bold tracking-[0.11em] uppercase ${props.tone === "flame" ? "text-flame-deep" : "text-ink3"}`}
    >
      {props.children}
    </p>
  );
}
