import { Progress } from "@bumpinto/web";

/* Şerit 7px yüksekliğinde ve tam genişlikte akar — kare bir görsel değil,
   ince bir çizgi beklenir. Hücreler yalnız `value` ile ayrışır. */

/** W3 · deste sayacı 2/12 — gradyan dolgu şeridin solunda yeni başlamış. */
export function DeckStart() {
  return <Progress value={2 / 12} />;
}

/** W2 · "3 / 5 hazır" — katılımcıların çoğunluğu konumunu göndermiş. */
export function WaitingMostReady() {
  return <Progress value={3 / 5} />;
}

/** Şerit dolu: herkes hazır (5/5) ya da deste bitti — gradyan uçtan uca. */
export function Complete() {
  return <Progress value={1} />;
}
