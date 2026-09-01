import { Note } from "@bumpinto/web";

/** W1 · başlık altı açıklama — 13px, `ink2`, sola yaslı. */
export function UnderTitle() {
  return <Note>Konumunu at, ortada buluşalım. Hesap filan gerekmez.</Note>;
}

/** W3 · `center` — ortalanmış özet satırı (deste bitiş ekranı). */
export function Centered() {
  return <Note center>7 mekanı beğendin.</Note>;
}
