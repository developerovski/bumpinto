/* Kaynak: ui.css .a-cel / .a-cel--sq + artboard `.cel` konumları — W0 Landing 1280 (598-600),
   W8 Karar 1280 (2518-2522) / 390 (2602-2604). */

const BASE = "pointer-events-none absolute z-5";

/* Nokta biçimleri: `.cel` yuvarlak, `.cel.sq` döndürülmüş kare. Yeşil artboard'da doğrudan
   #18B26B — `--color-grass` (#0b7a44) DEĞİL, o yüzden ham değer. */
const SUN = "h-[0.5625rem] w-[0.5625rem] rounded-full bg-sun";
const FLAME = "h-[0.4375rem] w-[0.4375rem] rounded-[0.1875rem] bg-flame rotate-[20deg]";
const VIOLET = "h-[0.375rem] w-[0.375rem] rounded-full bg-[#7c4dff]";
const GRASS = "h-[0.375rem] w-[0.375rem] rounded-full bg-[#18b26b]";
const FLAME2 = "h-[0.375rem] w-[0.375rem] rounded-[0.1875rem] bg-flame2 rotate-[20deg]";

/* Artboard koordinatlarından sınıfa: `top` değerinden tarayıcı çerçevesi + üst bar (44+64px),
   `left` değerinden `.wrap` yatay boşluğu (80px) düşülür — Landing'de kullanılan dönüşümün
   aynısı. `lg:right-auto`: mobil `right-*` değeri masaüstünde `left-*` ile çakışmasın diye. */
const POS = {
  // W8 · Karar — 390'da üç nokta (2602-2604), 1280'de beş (2518-2522).
  result: [
    { cls: SUN, pos: "top-[2.625rem] left-9 lg:left-[30rem]" },
    { cls: FLAME, pos: "top-[5.125rem] right-12 lg:top-[5.75rem] lg:right-auto lg:left-[38.125rem]" },
    { cls: VIOLET, pos: "top-8 right-[5.625rem] lg:top-3 lg:right-auto lg:left-[35rem]" },
    { cls: GRASS, pos: "hidden lg:block lg:top-[19.5rem] lg:left-4" },
    { cls: FLAME2, pos: "hidden lg:block lg:top-[13.875rem] lg:left-[40rem]" },
  ],
  // W0 · Landing — 390'da iki nokta, 1280'de üç.
  landing: [
    { cls: SUN, pos: "top-[4.375rem] left-9 lg:top-[2.625rem] lg:left-[30rem]" },
    { cls: FLAME, pos: "top-[6.875rem] right-12 lg:top-[5.125rem] lg:right-10" },
    { cls: VIOLET, pos: "hidden lg:block lg:top-3 lg:right-[13.75rem]" },
  ],
};

/** Kutlama konfetisi. Fragment: noktalar `Page` (relative) doğrudan çocuğu kalır. */
export default function Confetti(props: { variant?: keyof typeof POS }) {
  return (
    <>
      {POS[props.variant ?? "result"].map((c, i) => (
        <span key={i} className={`${BASE} ${c.pos} ${c.cls}`} aria-hidden />
      ))}
    </>
  );
}
