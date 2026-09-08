/* Shim: palet ve kanonik dizin `@bumpinto/shared`'ta (mobil de aynı paleti okur).
   Burada yalnız CSS gradyan dizesi üretilir — RN'de `linear-gradient(...)` yoktur. */
import { PERSON_TINTS, personTint } from "@bumpinto/shared";

export { personIndexMap, personIndexOf } from "@bumpinto/shared";

const css = ([from, to]: readonly [string, string]) => `linear-gradient(135deg,${from},${to})`;

/** Artboard `.avA` / `.avB` / `.avC` / `.avD` (190-193) — sıra ANLAMLIDIR. */
export const PERSON_GRADIENTS: string[] = PERSON_TINTS.map(css);

/** Kanonik dizinden gradyan. Negatif/eksik dizin ilk renge düşer. */
export function personGradient(index: number | undefined): string {
  return css(personTint(index));
}
