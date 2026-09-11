/* Kaynak: Keşfet POC artboard P3/P3a `.stp` — `−  4  +` sayaç (44px hücreler, ortada 52px sayı). */
import { Minus, Plus } from "@phosphor-icons/react";

const CELL =
  "flex h-11 w-11 items-center justify-center text-ink cursor-pointer " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

/** Sınırlı tam sayı sayacı. Sınırda düğme KAPALI GÖRÜNÜR (değer sessizce kırpılmaz) ama native
    `disabled` DEĞİL: odaktaki düğme `disabled` olunca klavye odağı sayfaya düşer, ekran okuyucu
    yerini kaybeder — `aria-disabled` + tıklamada hiçbir şey yapmamak odağı yerinde tutar.
    Sayı `output` — değişince ekran okuyucu duyurur. */
export default function Stepper(props: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  /** Grubun erişilebilir adı (görünür başlıkla aynı metin). */
  label: string;
  decLabel: string;
  incLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={props.label}
      className="inline-flex flex-none items-center overflow-hidden rounded-full border-[1.5px] border-line2 bg-white font-head font-bold"
    >
      <button type="button" className={CELL} aria-label={props.decLabel} aria-disabled={props.value <= props.min}
        onClick={() => props.value > props.min && props.onChange(props.value - 1)}>
        <Minus size={16} weight="bold" aria-hidden />
      </button>
      <output aria-live="polite" className="flex h-11 min-w-[3.25rem] items-center justify-center border-x border-line text-[1.125rem]">
        {props.value}
      </output>
      <button type="button" className={CELL} aria-label={props.incLabel} aria-disabled={props.value >= props.max}
        onClick={() => props.value < props.max && props.onChange(props.value + 1)}>
        <Plus size={16} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
