/* Kaynak: Button.tsx zincirleri (ui.css .a-btn* / a.a-btn--* renk ezmeleri) / DS v2 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { buttonAligns, buttonBase, buttonKinds } from "./buttonStyles";

/** `<a>` gövdeli buton — dış bağlantılar (W4 "Yol tarifi al", viral CTA).
    `app.css @layer base`'deki `a` / `a:hover` renk + `underline` kuralları, kaskad katman
    sırası (base < utilities) gereği zincirdeki `text-*` ve `no-underline` utility'lerine
    yenilir — özgüllükten bağımsız. Sonuç: hover'da ne renk ne alt çizgi değişir. */
const PILL = "w-full px-6 text-base";
/** md = ui.css .a-btn 52px; sm = artboard W4 viral CTA 46px; fit = ui.css .btn.fit
    (aynı 52px yükseklik, genişlik içerik kadar — W10 hata ekranı "Ana sayfa"). */
const sizes = {
  md: `${PILL} min-h-[3.25rem]`,
  sm: `${PILL} min-h-[2.875rem]`,
  fit: "w-auto px-6 text-base min-h-[3.25rem]",
  /** DS .bsm — küçük beyaz pill (42px / 14px / yatay 16px). */
  "fit-sm": "w-auto min-h-[2.625rem] px-4 text-[0.875rem]",
};

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  kind?: keyof typeof buttonKinds;
  size?: keyof typeof sizes;
  /** Yalnız çakışmayan ekler (ör. `mt-3`); ölçü ezmesi için `size` kullan. */
  className?: string;
  children: ReactNode;
};

export default function LinkButton({
  kind = "flame",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      className={[buttonBase, buttonKinds[kind], sizes[size], buttonAligns.center, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </a>
  );
}
