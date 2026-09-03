/* Karar dokümanı §5b — ulaşım türü ikon + etiket sözlüğü. Roster satırı, orta nokta yan notu
   VE JoinForm/NewSession/Profile'ın `TravelModeField` alanları bu dosyayı okur.
   `TravelMode` birleşimi `@bumpinto/shared`'ın üretilmiş tiplerinde ANONİM (satır-içi) —
   adlandırılmış TEK kaynak burasıdır (Task 6a review). Başka HİÇBİR dosya bu union'ı yeniden
   bildirmez (aynı desen `lib/serverEnums.ts`'teki `DecisionKind`/`RunoffReason` için de geçerli,
   Task 8 kapanışı). */
import { Bicycle, Car, Lightning, PersonSimpleWalk, Train, type Icon } from "@phosphor-icons/react";
import type { ParticipantDto } from "@bumpinto/shared";

export type TravelMode = NonNullable<ParticipantDto["travelMode"]>;

export const TRAVEL_MODES: readonly TravelMode[] = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"];

/** Sunucu varsayılanı (karar dokümanı §5b: "Participant.travelMode … varsayılan CAR"). */
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";

/** Roster satırı ikon(lar)ı. Çoğu modda TEK glif; Phosphor'da özel bir "e-bisiklet" glifi
    YOK — EBIKE iki glifin (Lightning + Bicycle) dizisiyle temsil edilir, çağıran yer
    (`ParticipantRow`) sırayla basar. Dizi olması `lib/` içinde JSX/className yazmadan
    (INDEX kuralı) iki glifi birlikte ifade etmenin tek yolu. */
export const MODE_ICON: Record<TravelMode, Icon[]> = {
  WALK: [PersonSimpleWalk],
  BIKE: [Bicycle],
  EBIKE: [Lightning, Bicycle],
  TRANSIT: [Train],
  CAR: [Car],
};

/** i18n ANAHTARLARI (metin değil) — `name` ekran-okuyucu etiketi, `coming` orta nokta yan
    notunun ulaşım-tarzı ifadesi ("… geliyor"). Çağıran yer `t()` ile çevirir. */
export const MODE_LABEL_KEY: Record<TravelMode, { name: string; coming: string }> = {
  WALK: { name: "travelMode.WALK.name", coming: "travelMode.WALK.coming" },
  BIKE: { name: "travelMode.BIKE.name", coming: "travelMode.BIKE.coming" },
  EBIKE: { name: "travelMode.EBIKE.name", coming: "travelMode.EBIKE.coming" },
  TRANSIT: { name: "travelMode.TRANSIT.name", coming: "travelMode.TRANSIT.coming" },
  CAR: { name: "travelMode.CAR.name", coming: "travelMode.CAR.coming" },
};
