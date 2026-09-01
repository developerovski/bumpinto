import { Sticker } from "@bumpinto/web";

/** 07 Runoff · sarı çıkartma — `sun` dolgu, kalın mürekkep çerçevesi, 2.5° sola yatık. */
export function Sun() {
  return <Sticker>Son düzlük</Sticker>;
}

/** W4 · kazanan kartının köşesine iliştirilen çıkartma — aynı varyant, gerçek metin. */
export function Decided() {
  return <Sticker>Karar verildi!</Sticker>;
}

/** W4 viral blok · `white` — beyaz dolgu ve ters yön (1.8° sağa yatık). */
export function White() {
  return <Sticker white>sıra sende</Sticker>;
}

/** İki varyant yan yana — dönüş yönlerinin zıtlığı burada okunur. */
export function Rotations() {
  return (
    <div className="flex items-center gap-4">
      <Sticker>Son düzlük</Sticker>
      <Sticker white>sıra sende</Sticker>
    </div>
  );
}
