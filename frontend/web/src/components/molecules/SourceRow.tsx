/* Artboard W17 · atıf satırı — ikon yok; sağda lisans metni, etiket dış bağlantı olabilir. */
export default function SourceRow(props: { label: string; hint?: string; href?: string | null; aside?: string }) {
  return (
    <li className="flex items-center gap-3 px-[1.125rem] py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {props.href ? (
          <a href={props.href} target="_blank" rel="noreferrer" className="text-[0.875rem] font-semibold text-ink">{props.label}</a>
        ) : (
          <span className="text-[0.875rem] font-semibold text-ink">{props.label}</span>
        )}
        {props.hint && <span className="text-[0.75rem] leading-normal text-ink2">{props.hint}</span>}
      </span>
      {props.aside && <span className="flex-none text-[0.75rem] text-ink2">{props.aside}</span>}
    </li>
  );
}
