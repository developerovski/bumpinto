/* Artboard .card(padding:0) + .dv ayraçları — ayar satırlarının kabı. */
import type { ReactNode } from "react";

/* Ayraç kartın KENARINDAN İÇERİ çekilir (artboard 4733/4735/4737: `.dv` margin 0 18px;
   390 karşılıklarında 0 16px). `divide-y` kenardan kenara tam genişlik çiziyordu.
   Çizgi satırın kendi `::before`'ı olarak basılır: satır bileşenleri (SettingRow / SourceRow)
   bu kabın dışında da paylaşıldığından ayraç ÖLÇÜSÜ kabın sorumluluğunda kalmalı — satır
   bileşeni "ilk miyim" bilgisini taşımak zorunda kalmaz. */
const DIVIDER =
  "[&>li+li]:relative [&>li+li]:before:absolute [&>li+li]:before:inset-x-4 " +
  "[&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-line " +
  "[&>li+li]:before:content-[''] lg:[&>li+li]:before:inset-x-[1.125rem]";

export default function SettingsCard(props: { children: ReactNode; danger?: boolean; label?: string }) {
  return (
    <ul
      aria-label={props.label}
      className={[
      "m-0 flex list-none flex-col rounded-card border bg-card p-0 shadow-sh1",
      DIVIDER,
      props.danger ? "border-[#efc9c2]" : "border-line",
    ].join(" ")}
    >
      {props.children}
    </ul>
  );
}
