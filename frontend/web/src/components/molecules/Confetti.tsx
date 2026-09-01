/* Kaynak: ui.css .a-cel / .a-cel--sq + ResultScreen konum değerleri (artboard W4 .cel) */

const BASE = "pointer-events-none absolute z-5";

/** Artboard W4 · kutlama konfetisi — üç nokta; `top` değerleri 68px tarayıcı
    çerçevesi düşülerek. Fragment: noktalar sayfanın doğrudan çocuğu kalır. */
export default function Confetti() {
  return (
    <>
      <span
        className={`${BASE} top-[2.625rem] left-9 h-[0.5625rem] w-[0.5625rem] rounded-full bg-sun`}
        aria-hidden
      />
      <span
        className={
          `${BASE} top-[5.125rem] right-12 h-[0.4375rem] w-[0.4375rem] ` +
          "rounded-[0.1875rem] bg-flame rotate-[20deg]"
        }
        aria-hidden
      />
      <span
        className={`${BASE} top-8 right-[5.625rem] h-[0.375rem] w-[0.375rem] rounded-full bg-[#7c4dff]`}
        aria-hidden
      />
    </>
  );
}
