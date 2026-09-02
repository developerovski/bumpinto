/* Kaynak: DS v2 §07 — ≥1024 grid 58fr 42fr gap 40; harita ekranlarında 42/58. */
import type { ReactNode } from "react";

const cols = {
  default: "lg:grid-cols-[58fr_42fr]",
  map: "lg:grid-cols-[42fr_58fr]",
};

export default function TwoZone(props: {
  left: ReactNode;
  right: ReactNode;
  variant?: keyof typeof cols;
  /** Landing: iki bölge dikeyde ortalanır. */
  centerY?: boolean;
  /** Artboard 390: sağ bölge yok — yalnız ≥1024'te göster. */
  rightLgOnly?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-4 lg:grid lg:gap-10",
        cols[props.variant ?? "default"],
        props.centerY ? "lg:items-center" : "lg:items-start",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-4">{props.left}</div>
      <div className={`${props.rightLgOnly ? "hidden lg:flex" : "flex"} min-w-0 flex-col gap-4`}>{props.right}</div>
    </div>
  );
}
