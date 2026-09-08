/* Artboard `.chk` (167-169) — 26px seçim dairesi: seçilide `--grad` dolgu + beyaz tik, seçilmemişte
   1.5px `--line-in` kenarlık. "Beğendiklerin" satırı (hep seçili) ve Liste modu satırı (değişken)
   AYNI daireyi çizer; sınıf zinciri bu yüzden tek yerde yaşar. Tailwind dizeleri düz `.ts`
   modülünde: `components/` altındaki bir `.tsx` yalnız bileşen export edebilir (Fast Refresh). */

export const CHECK_BASE =
  "flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full";
/** Seçili — gradyan dolgu, beyaz tik. */
export const CHECK_ON = `${CHECK_BASE} bg-[image:var(--grad)] text-white`;
/** Değişken (Liste modu): görünüm `peer` işaret kutusunun durumundan gelir; tik seçilmemişken
    `text-transparent` ile kaybolur — ayrı bir düğüm gizlemeye gerek yok. */
export const CHECK_PEER =
  `${CHECK_BASE} border-[1.5px] border-line-in text-transparent ` +
  "peer-checked:border-transparent peer-checked:bg-[image:var(--grad)] peer-checked:text-white " +
  "peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-flame-deep peer-focus-visible:outline-offset-[3px]";
