/* Karar dokümanı §5b — ulaşım türü sözlüğü. Roster satırı, orta nokta yan notu VE
   JoinForm/NewSession/Profile'ın `TravelModeField` alanları bu dosyayı okur.
   `TravelMode` birleşimi üretilmiş tiplerde ANONİM (satır-içi) — adlandırılmış TEK kaynak
   burasıdır. Başka HİÇBİR dosya bu union'ı yeniden bildirmez (aynı desen `serverEnums.ts`'teki
   `DecisionKind`/`RunoffReason` için de geçerli).

   İKONLAR BURADA DEĞİL: Phosphor'un web ve React Native paketleri ayrı bileşenler döndürür;
   glif eşlemesi her istemcinin kendi dosyasında yaşar (`web/src/lib/travelMode.ts`,
   `mobile/src/icons.ts`) ve ikisi de aynı EBIKE = iki glif kuralını uygular. */
import type { ParticipantDto } from "./api";

export type TravelMode = NonNullable<ParticipantDto["travelMode"]>;

export const TRAVEL_MODES: readonly TravelMode[] = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"];

/** Sunucu varsayılanı (karar dokümanı §5b: "Participant.travelMode … varsayılan CAR"). */
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";

/** i18n ANAHTARLARI (metin değil) — `name` ekran-okuyucu etiketi, `coming` orta nokta yan
    notunun ulaşım-tarzı ifadesi ("… geliyor"). Çağıran yer `t()` ile çevirir. */
export const MODE_LABEL_KEY: Record<TravelMode, { name: string; coming: string }> =
  Object.fromEntries(
    TRAVEL_MODES.map((m) => [m, { name: `travelMode.${m}.name`, coming: `travelMode.${m}.coming` }]),
  ) as Record<TravelMode, { name: string; coming: string }>;
