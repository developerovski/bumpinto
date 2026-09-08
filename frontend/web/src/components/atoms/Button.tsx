/* Kaynak: ui.css .a-btn* / DS v2. Tailwind zincirleri `./buttonStyles`'ta (Fast Refresh
   bir .tsx modülün TÜM export'larının bileşen olmasını gerektirir; base/kinds/aligns
   `LinkButton` ile ortak olduğundan zaten paylaşılan bir modülde yaşamaları gerekiyordu). */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { buttonAligns, buttonBase, buttonKinds } from "./buttonStyles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** DS kural 1: "grad" yalnız round/ikon kullanımda — gradyan üstüne metin konmaz. */
  kind?: keyof typeof buttonKinds;
  shape?: "pill" | "round" | "round-sm";
  /** `sm` yalnız `shape="pill"` ile — artboard .bsm küçük beyaz buton (DeckHeader). */
  /** `fit` yalnız `shape="pill"` ile — artboard .fit içerik genişliğinde pill (Profil çıkış). */
  /** `xs` — artboard'ın satır içi `.bsm` ezmesi (34px/12px): "Haritada gör", "Bunu seç". */
  size?: "md" | "sm" | "xs" | "fit";
  /** İkonlu, sola yaslı kullanım (artboard W1 konum butonu). */
  align?: "center" | "start";
  children: ReactNode;
};

/** `round-sm` tek başına tamdır — eski `.a-btn--round` + `.a-btn--round-sm` bileşimi katlandı. */
const rounds = {
  pill: "w-full min-h-[3.25rem] px-6 text-base",
  round: "p-0 w-[3.875rem] min-h-[3.875rem] text-[1.5rem] flex-none",
  "round-sm": "p-0 w-11 min-h-11 text-[1.125rem] flex-none",
};

/* DS .bsm — küçük beyaz pill (42px / 14px / yatay 16px). */
const pillSm = "w-auto min-h-[2.625rem] px-4 text-[0.875rem]";
/* Artboard satır içi `.bsm` ezmesi (1549/1645/1747/3269): 34px / 12px / yatay 12px. */
const pillXs = "w-auto min-h-[2.125rem] px-3 text-[0.75rem]";
/* DS .fit — içerik genişliğinde pill (Profil çıkış butonu, masaüstü). */
const pillFit = "w-auto px-6 text-base min-h-[3.25rem]";

// forwardRef: odak yönetimi (VoiceDock) gerçek DOM düğümü ister (React 19'da `ref` düz prop olur,
// bu saracak da kaldırılabilir).
const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { kind = "flame", shape = "pill", size = "md", align = "center", className, children, ...rest },
  ref,
) {
  const sizeClass =
    shape === "pill" && size === "sm"
      ? pillSm
      : shape === "pill" && size === "xs"
        ? pillXs
        : shape === "pill" && size === "fit"
          ? pillFit
          : rounds[shape];
  return (
    <button
      ref={ref}
      {...rest}
      // `className` EZMEZ, EKLENİR: çağıranın `flex-1`/`self-center` gibi yerleşim sınıfları
      // sarmalayıcı div'e sarılmak zorunda kalmasın (eskiden `{...rest}` içinde sessizce düşüyordu).
      className={[buttonBase, buttonKinds[kind], sizeClass, buttonAligns[align], className]
        .filter(Boolean)
        .join(" ")
        .trim()}
    >
      {children}
    </button>
  );
});

export default Button;
