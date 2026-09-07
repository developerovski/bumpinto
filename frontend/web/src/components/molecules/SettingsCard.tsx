/* Artboard .card(padding:0) + .dv ayraçları — ayar satırlarının kabı. */
import type { ReactNode } from "react";

export default function SettingsCard(props: { children: ReactNode; danger?: boolean; label?: string }) {
  return (
    <ul
      aria-label={props.label}
      className={[
      "m-0 flex list-none flex-col divide-y divide-line rounded-card border bg-card p-0 shadow-sh1",
      props.danger ? "border-[#efc9c2]" : "border-line",
    ].join(" ")}
    >
      {props.children}
    </ul>
  );
}
