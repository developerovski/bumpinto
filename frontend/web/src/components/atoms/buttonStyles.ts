/* Kaynak: ui.css .a-btn* / DS v2 — Button.tsx VE LinkButton.tsx ortak stil zinciri. Bu değerlerin
   tek kaynağı burasıdır. Tailwind sınıf dizeleri Button.tsx'te kalırsa modül tümüyle bileşen
   olmaktan çıkar (Fast Refresh bir .tsx modülün TÜM export'larının bileşen olmasını gerektirir);
   `components/` altında kalan plain `.ts` dosyası hem Tailwind kuralına hem Fast Refresh'e uyar. */

/** DS kural 1: "grad" yalnız round/ikon kullanımda — gradyan üstüne metin konmaz. */
export const buttonBase =
  "flex items-center rounded-full border-[1.5px] font-head font-bold " +
  "cursor-pointer no-underline " +
  "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
  "disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed";

export const buttonKinds = {
  flame: "bg-flame-deep text-white border-transparent shadow-[0_8px_24px_rgba(222,36,86,0.3)]",
  white: "bg-card text-ink border-line2 shadow-sh1",
  grad:
    "bg-[image:var(--grad)] text-white border-transparent " +
    "shadow-[0_10px_26px_rgba(222,36,86,0.35)]",
  /** DS .b-dg — tehlikeli aksiyon (çıkış yap). */
  danger: "bg-transparent text-[#c0392b] border-[#efc9c2]",
  /** Artboard `.b-gh` — Karar 1280 "Google Maps'te aç": inline ghost bağlantı. */
  ghost: "bg-transparent text-ink border-line2",
};

export const buttonAligns = {
  center: "justify-center gap-[0.5625rem]",
  start: "justify-start gap-3",
};
