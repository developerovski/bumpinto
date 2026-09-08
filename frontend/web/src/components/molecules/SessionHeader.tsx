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
  /** Başlık ölçüsü: `md` (varsayılan) 24px sabit; `sm` Deste başlığı (390'da 17px, 1280'de 24px);
      `auto` global h2'ye bırakır (21/24px — Liste modu). */
  titleSize?: "md" | "sm" | "auto";
  /** Artboard 1280 W3b/W3c: rozetler ve meta AYNI sarmalayan satırda (iki ayrı satır değil). */
  inlineMeta?: boolean;
  /** Artboard 390: aksiyon başlığın yanına sığmaz — kendi satırına, tam genişlikte iner. */
  stackAction?: boolean;
}) {
  const badges = props.badges && (
    <div className="flex flex-wrap items-center gap-2">{props.badges}</div>
  );
  const meta = props.meta && (
    <span className="text-[0.75rem] text-ink2 tabular-nums">{props.meta}</span>
  );
  return (
    <div
      className={`flex items-center justify-between gap-5${
        props.stackAction ? " max-lg:flex-wrap" : ""
      }`}
    >
      <div className="flex flex-col gap-0.5">
        {props.as === "h1" ? (
          <h1>{props.title}</h1>
        ) : (
          <h2
            className={
              props.titleSize === "sm"
                ? "text-[1.0625rem] lg:text-[1.5rem]"
                : props.titleSize === "auto"
                  ? undefined
                  : "text-[1.5rem]"
            }
          >
            {props.title}
          </h2>
        )}
        {props.inlineMeta ? (
          (badges || meta) && (
            <div className="flex flex-wrap items-center gap-2">
              {badges}
              {meta}
            </div>
          )
        ) : (
          <>
            {badges}
            {meta}
          </>
        )}
      </div>
      {props.action && (
        <div className={props.stackAction ? "max-lg:order-last max-lg:w-full" : undefined}>
          {props.action}
        </div>
      )}
    </div>
  );
}
