/* Kaynak: ui.css .a-btn* / DS v2 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

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

/* base/kinds/aligns `LinkButton` ile ortaktır — değerin tek kaynağı burasıdır. */
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

export const buttonAligns = {
  center: "justify-center gap-[0.5625rem]",
  start: "justify-start gap-3",
};

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
