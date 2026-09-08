/* Artboard W14/W15/W16 okuyucu tipografisi (.lg-h / .lg-p / .lg-ul / .tbl / amber not).
   Metin blok VERİSİ olarak gelir: içerik dosyaları sınıf dizesi taşımaz, tek renderer basar. */
import { Info } from "@phosphor-icons/react";
import type { LegalBlock } from "@bumpinto/shared";
import { Fragment, type ReactNode } from "react";

/* Blok TİPİ `@bumpinto/shared`ta: aynı içeriği mobil `LegalReader` da basar (M-5:T7). */
export type { LegalBlock } from "@bumpinto/shared";

/** Artboard `.lg-meta` (515) — "Son güncelleme" / "Verildi" damgası: 12.5px, NORMAL ağırlık,
    ink2, cümle düzeni. `Overline` (11.5px/700/BÜYÜK HARF/tracked) bu satır için yanlıştı:
    tarih ve sürüm numarası tümü büyük harfe çevrilince okunmuyordu. */
export function LegalMeta({ children }: { children: ReactNode }) {
  return <p className="text-[0.78125rem] leading-normal text-ink2">{children}</p>;
}

export default function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        /* `.lg-h` (511) üst boşluğu 6px. */
        if ("h" in b) return <h2 key={i} className="mt-1.5 font-head text-[1.0625rem] font-bold text-ink">{b.h}</h2>;
        if ("p" in b) {
          const cls = `text-[0.9375rem] leading-relaxed ${b.muted ? "text-ink2" : "text-ink"}`;
          const cut = b.strong && b.p.includes(b.strong) ? b.p.split(b.strong) : null;
          return (
            <p key={i} className={cls}>
              {cut ? <>{cut[0]}<b className="font-bold">{b.strong}</b>{cut.slice(1).join(b.strong)}</> : b.p}
            </p>
          );
        }
        if ("note" in b)
          return (
            /* Artboard 5108-5110: amber kartta metinden ÖNCE 17px `ph-info` durur. */
            <p key={i} className="flex gap-2.5 rounded-2xl border border-[#f2ddb0] bg-amber-wash p-[0.75rem_0.875rem] text-[0.8125rem] leading-normal text-ink">
              <Info size={17} aria-hidden className="mt-px flex-none text-amber" />
              <span>{b.note}</span>
            </p>
          );
        if ("ul" in b)
          return (
            /* `.lg-ul` (514) girintisi 18px. */
            <ul key={i} className="flex list-disc flex-col gap-1 pl-[1.125rem] text-[0.9375rem] leading-relaxed text-ink">
              {b.ul.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        if ("link" in b)
          return (
            <p key={i} className="text-[0.9375rem] leading-relaxed text-ink">
              {b.link[0]}
              <a href={b.link[2]} className="text-flame-deep">{b.link[1]}</a>
            </p>
          );
        return (
          /* Artboard `.tbl` (516–518): İKİ EŞİT sütun, tek dış kenarlık + radius 14px, her
             hücrede 1px alt ayraç (son satırda kapatılır — dış kenarlıkla çakışıp 2px görünürdü),
             tek (terim) sütununda #FBF5EC zemin. Bu ton app.css'te token DEĞİL ve yalnız burada
             geçiyor; artboard değeri amber notun #F2DDB0 kenarlığı gibi birebir yazılır. */
          <dl
            key={i}
            className={
              "m-0 grid grid-cols-2 overflow-hidden rounded-[0.875rem] border border-line " +
              "text-[0.8125rem] leading-normal text-ink " +
              "[&>*]:border-b [&>*]:border-line [&>*:nth-last-child(-n+2)]:border-b-0"
            }
          >
            {b.table.map(([term, value]) => (
              <Fragment key={term}>
                <dt className="bg-[#fbf5ec] px-2.5 py-2 font-semibold">{term}</dt>
                <dd className="m-0 px-2.5 py-2">{value}</dd>
              </Fragment>
            ))}
          </dl>
        );
      })}
    </>
  );
}
