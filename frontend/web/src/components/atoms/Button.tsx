import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** DS kural 1: "grad" yalnız round/ikon kullanımda — gradyan üstüne metin konmaz. */
  kind?: "flame" | "white" | "grad";
  shape?: "pill" | "round" | "round-sm";
  /** İkonlu, sola yaslı kullanım (artboard W1 konum butonu). */
  align?: "center" | "start";
  children: ReactNode;
};

export default function Button({
  kind = "flame",
  shape = "pill",
  align = "center",
  children,
  ...rest
}: Props) {
  const classes = ["a-btn", `a-btn--${kind}`];
  if (shape !== "pill") classes.push("a-btn--round");
  if (shape === "round-sm") classes.push("a-btn--round-sm");
  if (align === "start") classes.push("a-btn--start");
  return (
    <button {...rest} className={classes.join(" ")}>
      {children}
    </button>
  );
}
