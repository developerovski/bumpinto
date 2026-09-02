export default function Segmented<T extends string>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className="inline-flex gap-0.5 rounded-full bg-sand p-[3px]">
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => props.onChange(o.value)}
            className={`rounded-full px-[0.875rem] py-[7px] font-head text-[0.8125rem] font-bold ${on ? "bg-white text-ink shadow-sh1" : "text-ink2"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
