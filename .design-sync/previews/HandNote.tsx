import { HandNote } from "@bumpinto/web";

/** 07 Runoff · oy kilitlendikten sonraki el yazısı not — Caveat 19px, 1.5° sola yatık. */
export function Locked() {
  return <HandNote center>seçimin kilitli — diğerlerini bekliyoruz</HandNote>;
}

/** `center` olmadan — sola yaslı hâli (liste altındaki kenar notu). */
export function LeftAligned() {
  return <HandNote>kim neyi seçti, sonuçta belli olur</HandNote>;
}
