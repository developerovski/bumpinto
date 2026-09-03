/* Kaynak: ui.css .a-btn* / DS v2. Tailwind zincirleri `./buttonStyles`'ta (Fast Refresh
   bir .tsx modülün TÜM export'larının bileşen olmasını gerektirir; base/kinds/aligns
   `LinkButton` ile ortak olduğundan zaten paylaşılan bir modülde yaşamaları gerekiyordu). */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonAligns, buttonBase, buttonKinds } from "./buttonStyles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** DS kural 1: "grad" yalnız round/ikon kullanımda — gradyan üstüne metin konmaz. */
  kind?: keyof typeof buttonKinds;
  shape?: "pill" | "round" | "round-sm";
  /** `sm` yalnız `shape="pill"` ile — artboard .bsm küçük beyaz buton (DeckHeader). */
  /** `fit` yalnız `shape="pill"` ile — artboard .fit içerik genişliğinde pill (Profil çıkış). */
  size?: "md" | "sm" | "fit";
  /** İkonlu, sola yaslı kullanım (artboard W1 konum butonu). */
  align?: "center" | "start";
  children: ReactNode;
};

/** `round-sm` tek başına tamdır — eski `.a-btn--round` + `.a-btn--round-sm` bileşimi katlandı. */
const rounds = {
  pill: "w-full min-h-[3.25rem] px-6 text-base",
  round: "p-0 w-[3.75rem] min-h-[3.75rem] text-[1.375rem] flex-none",
  "round-sm": "p-0 w-[3rem] min-h-[3rem] text-base flex-none",
};

/* DS .bsm — küçük beyaz pill (42px / 14px / yatay 16px). */
const pillSm = "w-auto min-h-[2.625rem] px-4 text-[0.875rem]";
/* DS .fit — içerik genişliğinde pill (Profil çıkış butonu, masaüstü). */
const pillFit = "w-auto px-6 text-base min-h-[3.25rem]";

export default function Button({
  kind = "flame",
  shape = "pill",
  size = "md",
  align = "center",
  children,
  ...rest
}: Props) {
  const sizeClass =
    shape === "pill" && size === "sm"
      ? pillSm
      : shape === "pill" && size === "fit"
        ? pillFit
        : rounds[shape];
  return (
    <button
      {...rest}
      className={[buttonBase, buttonKinds[kind], sizeClass, buttonAligns[align]]
        .join(" ")
        .trim()}
    >
      {children}
    </button>
  );
}
