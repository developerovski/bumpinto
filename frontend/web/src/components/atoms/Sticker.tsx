import type { CSSProperties, ReactNode } from "react";

export default function Sticker(props: {
  children: ReactNode;
  /** Artboard .stk.w — beyaz çıkartma (W4 viral blok). */
  white?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span className={props.white ? "a-sticker a-sticker--white" : "a-sticker"} style={props.style}>
      {props.children}
    </span>
  );
}
