import type { ReactNode } from "react";

/** Harita kutusu: kenarlık, köşe, yükseklik, 390 gizleme, sol-alt kapsül ve ekran okuyucu özeti.
    Üç yerden okunur (anahtar, google, maplibre) — sınıf dizesi tek yerde durur. */
export default function MapFrame(props: {
  heightClass?: string;
  lgOnly?: boolean;
  caption?: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="mapview"
      className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${props.heightClass ?? "h-[20rem]"} ${props.lgOnly ? "hidden lg:block" : ""}`}
    >
      {props.children}
      {props.caption && (
        <span className="absolute bottom-2.5 left-3.5 inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.92)] px-[0.6875rem] py-1.5 text-[0.75rem] font-bold text-ink">
          {props.caption}
        </span>
      )}
      {props.summary != null && <p className="sr-only">{props.summary}</p>}
    </div>
  );
}
