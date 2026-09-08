import type { ReactNode } from "react";

/** DS `.f-seg` — sand zemin, beyaz aktif hap. `icon` verilirse (TravelModeField) etikete önce
    basılır; `size="lg"` 44px dokunma hedefi verir (TravelModeField), varsayılan `"sm"` mevcut
    VenueSort/TypeSelector ölçüsünü AYNEN korur (geriye dönük uyum — bu iki çağıran değişmez).
    `size="xs"` DS `.f-mp` — Konumlar satırındaki 22px yuvarlak ikon hücreleri (etiket yalnız
    `aria-label`). `fill` DS `.f-seg.icn` — ray satırın TAMAMINI kaplar. */
export default function Segmented<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  ariaLabel?: string;
  size?: "xs" | "sm" | "lg";
  /** DS `.f-seg.icn` (artboard W1/W2 390 ulaşım rayı): kap `width:100%` + `flex-wrap:nowrap`,
      köşe 16px; hücreler `flex:1` + ortalanmış, köşe 13px. */
  fill?: boolean;
}) {
  const size = props.size ?? "sm";
  const xs = size === "xs";
  // `.f-mp` kabı: gap 1px, padding 2px, tam yuvarlak — `.f-seg`'in (gap 2px, padding 3px) küçük kardeşi.
  const container = xs
    ? "inline-flex flex-none gap-px rounded-full bg-sand p-0.5"
    : props.fill
      ? "flex w-full flex-nowrap gap-0.5 rounded-2xl bg-sand p-[3px]"
      : "inline-flex flex-wrap gap-0.5 rounded-full bg-sand p-[3px]";
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className={container}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        // `.f-mp > *` 22px kare hücre; `.f-seg.icn span` `flex:1` + 9px dikey boşluk. Dolgulu
        // rayda `min-h-11` KORUNUR: DS'in 36px hücresi 44px dokunma hedefinin altında kalıyor,
        // erişilebilirlik kuralı ölçüden önce gelir (fark 2px + kap dolgusu).
        const cell = xs
          ? "h-[1.375rem] w-[1.375rem] rounded-full text-[0.8125rem]"
          : props.fill
            ? `flex-1 rounded-[0.8125rem] px-0 ${size === "lg" ? "min-h-11" : "py-[7px]"}`
            : `rounded-full ${size === "lg" ? "min-h-11 px-4" : "px-[0.875rem] py-[7px]"}`;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} aria-label={o.label}
            onClick={() => props.onChange(o.value)}
            className={`inline-flex items-center justify-center gap-1.5 font-head text-[0.8125rem] font-bold ${cell} ${
              on ? "bg-white text-ink shadow-sh1" : xs ? "text-ink3" : "text-ink2"
            }`}>
            {o.icon}
            {!xs && <span className={size === "lg" ? "hidden lg:inline" : undefined}>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
