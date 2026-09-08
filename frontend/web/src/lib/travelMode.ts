/* Shim: sözlük ve `TravelMode` birleşimi `@bumpinto/shared`'ta (mobil de aynı kaynağı okur).
   Burada yalnız WEB glif eşlemesi kalır — `@phosphor-icons/react` bileşenleri RN'de çalışmaz. */
import { Bicycle, Car, Lightning, PersonSimpleWalk, Train, type Icon } from "@phosphor-icons/react";
import type { TravelMode } from "@bumpinto/shared";

export {
  DEFAULT_TRAVEL_MODE,
  MODE_LABEL_KEY,
  TRAVEL_MODES,
  type TravelMode,
} from "@bumpinto/shared";

/** Roster satırı ikon(lar)ı. Çoğu modda TEK glif; Phosphor'da özel bir "e-bisiklet" glifi
    YOK — EBIKE iki glifin (Lightning + Bicycle) dizisiyle temsil edilir, çağıran yer
    (`ParticipantRow`) sırayla basar. */
export const MODE_ICON: Record<TravelMode, Icon[]> = {
  WALK: [PersonSimpleWalk],
  BIKE: [Bicycle],
  EBIKE: [Lightning, Bicycle],
  TRANSIT: [Train],
  CAR: [Car],
};
