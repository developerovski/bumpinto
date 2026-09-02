/* Kaynak: ui.css .a-cel / .a-cel--sq + artboard .cel konumları (W4 sonuç, W0 Landing) */

const BASE = "pointer-events-none absolute z-5";

// `top` değerleri artboard'dan tarayıcı çerçevesi + üst bar düşülerek alındı.
const POS = {
  // W4 · Sonuç
  result: {
    sun: "top-[2.625rem] left-9",
    flame: "top-[5.125rem] right-12",
    violet: "top-8 right-[5.625rem]",
  },
  // W0 · Landing — 390'da iki nokta, 1280'de üç.
  landing: {
    sun: "top-[4.375rem] left-9 lg:top-[2.625rem] lg:left-[30rem]",
    flame: "top-[6.875rem] right-12 lg:top-[5.125rem] lg:right-10",
    violet: "hidden lg:block lg:top-3 lg:right-[13.75rem]",
  },
};

/** Kutlama konfetisi — üç nokta. Fragment: noktalar `Page` (relative) doğrudan çocuğu kalır. */
export default function Confetti(props: { variant?: keyof typeof POS }) {
  const pos = POS[props.variant ?? "result"];
  return (
    <>
      <span
        className={`${BASE} ${pos.sun} h-[0.5625rem] w-[0.5625rem] rounded-full bg-sun`}
        aria-hidden
      />
      <span
        className={
          `${BASE} ${pos.flame} h-[0.4375rem] w-[0.4375rem] ` +
          "rounded-[0.1875rem] bg-flame rotate-[20deg]"
        }
        aria-hidden
      />
      <span
        className={`${BASE} ${pos.violet} h-[0.375rem] w-[0.375rem] rounded-full bg-[#7c4dff]`}
        aria-hidden
      />
    </>
  );
}
