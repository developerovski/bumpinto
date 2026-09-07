/* Artboard W14/W15/W16 okuyucu tipografisi (.lg-h / .lg-p / .lg-ul / .tbl / amber not).
   Metin blok VERİSİ olarak gelir: içerik dosyaları sınıf dizesi taşımaz, tek renderer basar. */
export type LegalBlock =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { table: [string, string][] }
  | { note: string }
  /** [önce yazılan metin, bağlantı etiketi, href] — iletişim/başvuru satırları. */
  | { link: [string, string, string] };

export default function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("h" in b) return <h2 key={i} className="mt-2 font-head text-[1.0625rem] font-bold text-ink">{b.h}</h2>;
        if ("p" in b) return <p key={i} className="text-[0.9375rem] leading-relaxed text-ink2">{b.p}</p>;
        if ("note" in b)
          return (
            <p key={i} className="rounded-2xl border border-[#f2ddb0] bg-amber-wash p-[0.75rem_0.875rem] text-[0.8125rem] leading-normal text-ink">
              {b.note}
            </p>
          );
        if ("ul" in b)
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 pl-5 text-[0.9375rem] leading-relaxed text-ink2">
              {b.ul.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        if ("link" in b)
          return (
            <p key={i} className="text-[0.9375rem] leading-relaxed text-ink2">
              {b.link[0]}
              <a href={b.link[2]} className="text-flame-deep">{b.link[1]}</a>
            </p>
          );
        return (
          <dl key={i} className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 gap-y-2 rounded-2xl border border-line bg-card p-[1rem_1.125rem]">
            {b.table.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-[0.8125rem] font-semibold text-ink">{term}</dt>
                <dd className="m-0 text-[0.8125rem] leading-normal text-ink2">{value}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </>
  );
}
