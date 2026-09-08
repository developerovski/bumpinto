/* Kaynak: ui.css .err / DS v2 */
import type { ReactNode } from "react";

export default function ErrorText(props: {
  children: ReactNode;
  /** `aria-describedby` hedefi — alanın altındaki hata metni alanla BAĞLANIR (artboard W4/W5
      "Hata durumları" tahtasının tek şartı). */
  id?: string;
  center?: boolean;
}) {
  return (
    <p
      role="alert"
      id={props.id}
      className={`text-[0.8125rem] leading-[1.4] font-semibold text-flame-deep${
        props.center ? " text-center" : ""
      }`}
    >
      {props.children}
    </p>
  );
}
