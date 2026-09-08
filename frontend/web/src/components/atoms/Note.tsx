/* Kaynak: ui.css .muted / DS v2 */
import type { ReactNode } from "react";

export default function Note(props: {
  center?: boolean;
  card?: boolean;
  /** Artboard `.mi` (12px) — `.cp` (13px) olan varsayılanın küçük kardeşi: şartlar satırı,
      saklama notu, hata ipucu. */
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={`${props.small ? "text-[0.75rem]" : "text-[0.8125rem]"} leading-normal text-ink2${
        props.center ? " text-center" : ""
      }${
        props.card ? " rounded-card border border-line bg-card p-[1rem_1.125rem]" : ""
      }`}
    >
      {props.children}
    </p>
  );
}
