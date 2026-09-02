/* Kaynak: artboard Deste 1280 .hdr — oturum adı + meta + sağ aksiyon */
import type { ReactNode } from "react";
export default function SessionHeader(props: { title: ReactNode; meta?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[1.5rem]">{props.title}</h2>
        {props.meta && <span className="text-[0.75rem] text-ink2 tabular-nums">{props.meta}</span>}
      </div>
      {props.action}
    </div>
  );
}
