/* Kaynak: ui.css h1 / sayfalardaki fontSize varyantları / DS v2 */
import type { ReactNode } from "react";

const sizes = {
  display: "",
  md: "text-[1.625rem]", // 26px (DeckScreen liste modu)
  hero: "text-[2.5rem] lg:text-[2.875rem]", // Landing: 390 40px / 1280 46px
  // Yeni oturum 390 (963) ve Karar 390 (2617) başlıkları 30px — varsayılan 34px değil.
  compact: "text-[1.875rem] lg:text-display-lg",
};

export default function Heading(props: {
  size?: keyof typeof sizes;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <h1
      className={[sizes[props.size ?? "display"], props.center ? "text-center" : ""]
        .join(" ")
        .trim()}
    >
      {props.children}
    </h1>
  );
}
