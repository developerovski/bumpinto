import type { ReactNode } from "react";

/** Artboard W1 · Oturumlar üst başlık — h1 + tek CTA aynı satırda. Artboard 390'da header CTA yok. */
export default function PageHeader(props: {
  title: ReactNode;
  action?: ReactNode;
  /** `reader` — yasal/hesap okuyucu sayfaları: 390'da başlık `.t1` (19px), 1280'de `.big`
      (artboard W13/W14/W16/W17/W19). Varsayılan `display` her iki uçta da büyük kalır. */
  size?: "display" | "reader";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <h1 className={props.size === "reader" ? "text-[1.1875rem] lg:text-display-lg" : undefined}>
        {props.title}
      </h1>
      {props.action && <div className="hidden lg:block">{props.action}</div>}
    </div>
  );
}
