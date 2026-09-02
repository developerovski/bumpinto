import type { ReactNode } from "react";

/** Artboard W1 · Oturumlar üst başlık — h1 + tek CTA aynı satırda. Artboard 390'da header CTA yok. */
export default function PageHeader(props: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <h1>{props.title}</h1>
      {props.action && <div className="hidden lg:block">{props.action}</div>}
    </div>
  );
}
