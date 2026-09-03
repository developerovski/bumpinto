/* Kaynak: ui.css .page / .page--deck / .page--result / DS v2 §07 Yerleşim — içerik max 1120px,
   yatay boşluk 24/48px. UI review: masaüstü ekranlar dar sütuna hapsolmasın — lg/xl'de kapak
   genişler (`wide` harita ekranlarında kapağı tamamen kaldırır). */
import type { ReactNode } from "react";

/* Alt boşluk (`pb-*`) BİLEREK bu haritanın dışında: `wide` dalıyla aynı sınıf listesine iki
   `lg:pb-*` girerse kazananı dizi sırası değil Tailwind'in çıktı sırası belirler. Ölçüldü:
   `lg:pb-4` + `lg:pb-11` birlikteyken 44px kazanıyor, haritanın altında ölü alan bırakıyordu. */
const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem]",
  deck: "gap-0 px-[1.125rem] pt-4 lg:gap-4 lg:px-8 xl:px-12 lg:pt-[2.125rem]",
  result: "gap-3.5 px-[1.125rem] pt-5 relative lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem]",
  landing: "gap-[0.9375rem] px-[1.125rem] pt-5 relative lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem]",
};

/** Mobil alt boşluk — Deste ekranı kartı ekranın dibine yaslar, diğerleri nefes alır. */
const bottomPad: Record<keyof typeof variants, string> = {
  default: "pb-8",
  deck: "pb-0",
  result: "pb-8",
  landing: "pb-8",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  /** Harita ekranları (Mekanlar) — lg kapağı tamamen kaldırır, harita sağ tarafı doldurur. */
  wide?: boolean;
  children: ReactNode;
}) {
  const variant = props.variant ?? "default";
  return (
    <main
      // Kabuğa "bu sayfa tam ekran" der (app.css `:has(> main[data-wide])`): kabuk KESİN
      // yükseklik alır, `flex-1` olan main kalan alanı birebir doldurur. Yüzdeli yükseklik
      // (haritanın `lg:h-full`'ü) yalnız kesin ölçülü kapla çözülür; `min-h` yetmiyordu.
      data-wide={props.wide ? "" : undefined}
      className={[
        // Yükseklik ölçüsü TEK yerden gelir: AppShell'in dikey flex kabuğu (`min-h-[100dvh]`),
        // main yalnız kalanı alır (`flex-1`). Daha önce main kendi `min-h-[calc(100dvh-3.5rem)]`
        // ölçüsünü de taşıyordu; üst çubuk + main + atıf altbilgisi toplamı bir ekranı 33px
        // aşıyor ve HER sayfada sahte bir kaydırma bırakıyordu (ölçüldü — UI review 2026-09-03).
        "mx-auto flex w-full max-w-[30rem] flex-1 flex-col",
        // wide: `min-h-0` içeriğin kabı büyütmesini keser — sayfa kaymaz, yalnız sol liste kayar
        // (VenueBrowser), harita sağ sütunu tam boy doldurur.
        props.wide ? "lg:max-w-none lg:min-h-0 lg:overflow-hidden" : "lg:max-w-[80rem] xl:max-w-[96rem]",
        variants[variant],
        bottomPad[variant],
        props.wide ? "lg:pb-4" : "lg:pb-11",
        props.center ? "justify-center" : "",
      ]
        .join(" ")
        .trim()}
    >
      {props.children}
    </main>
  );
}
