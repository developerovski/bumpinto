import type { ReactNode } from "react";

/** DS `.f-seg` — sand zemin, beyaz aktif hap. `icon` verilirse (TravelModeField) etikete önce
    basılır; `size="lg"` 44px dokunma hedefi verir (TravelModeField), varsayılan `"sm"` mevcut
    VenueSort/TypeSelector ölçüsünü AYNEN korur (geriye dönük uyum — bu iki çağıran değişmez). */
export default function Segmented<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  ariaLabel?: string;
  size?: "sm" | "lg";
}) {
  const lg = props.size === "lg";
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className="inline-flex flex-wrap gap-0.5 rounded-full bg-sand p-[3px]">
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} aria-label={o.label}
            onClick={() => props.onChange(o.value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full font-head text-[0.8125rem] font-bold ${
              lg ? "min-h-11 px-4" : "px-[0.875rem] py-[7px]"
            } ${on ? "bg-white text-ink shadow-sh1" : "text-ink2"}`}>
            {o.icon}
            <span className={lg ? "hidden lg:inline" : undefined}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
