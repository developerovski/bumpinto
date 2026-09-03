/* Kaynak: artboard Deste 1280 .hdr — oturum adı + meta + sağ aksiyon */
import type { ReactNode } from "react";
export default function SessionHeader(props: {
  title: ReactNode;
  /** Genelde string; Deste 390'da yalnız-mobil "· N beğeni" eki için ReactNode'a genişledi. */
  meta?: ReactNode;
  action?: ReactNode;
  /** Aktivite/durum rozetleri — başlık altında, meta üstünde. */
  badges?: ReactNode;
  /** "h1" → global h1 stili (Lobi/SoloSetup); varsayılan "h2" mevcut çağıranların görünümünü korur. */
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex flex-col gap-0.5">
        {props.as === "h1" ? <h1>{props.title}</h1> : <h2 className="text-[1.5rem]">{props.title}</h2>}
        {props.badges && <div className="flex flex-wrap items-center gap-2">{props.badges}</div>}
        {props.meta && <span className="text-[0.75rem] text-ink2 tabular-nums">{props.meta}</span>}
      </div>
      {props.action}
    </div>
  );
}
