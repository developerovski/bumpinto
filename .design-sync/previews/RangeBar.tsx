import type { ReactNode } from "react";
import { RangeBar } from "@bumpinto/web";
import { KARAKOY, MODA, TRAVEL, TRAVEL_ANCHORED } from "./_fixtures";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;
const Col = ({ children }: { children: ReactNode }) => <div style={COL}>{children}</div>;
const FAR = { ...MODA, travel: [MODA.travel[0], MODA.travel[1], { ...MODA.travel[2], minutes: 62 }] };

/* DÜZELTME: `Fair`/`Anchored` eskiden ikisi de `MODA` kullanıyordu. MODA 5 dk'ya yuvarlanınca
   30/35/20 çıkıyor: spread 15 SAME_FOR_ALL(10)'u aşıyor ama outlierId için gereken
   OUTLIER_GAP(10)'a da ulaşmıyor (35−medyan 30 = 5) — yani MODA HİÇBİR baş cümle çizmiyordu,
   `Anchored` ile `Fair` görsel olarak aynı çıkıyordu. `KARAKOY` (19/22/26 → yuvarlanınca
   20/20/25, spread 5 ≤ SAME_FOR_ALL) gerçekten yeşil "Herkese ~aynı" baş cümlesi üretiyor;
   `Anchored` aynı veriyle `travel.anchored=true` verip yalnız o cümleyi bastırdığını kanıtlıyor. */

/** W3b · liste satırının yol çubuğu: bant + baş harf noktaları + aralık + adalet satırı.
    `KARAKOY` yuvarlanınca 20/20/25 (spread 5) → yeşil "Herkese ~aynı" baş cümlesi + "fark 5 dk
    · en uzun yol Deniz". */
export function Fair() { return <Col><RangeBar venue={KARAKOY} travel={TRAVEL} /></Col>; }
/** Biri çok uzaktaysa bant amber, o nokta amber halkalı, baş cümle onu adlandırır.
    `FAR` (30/35/60 yuvarlanınca) → amber "Deniz için uzak" + "fark 30 dk". */
export function Outlier() { return <Col><RangeBar venue={FAR} travel={TRAVEL} /></Col>; }
/** Çapalı oturum: `Fair` ile AYNI `KARAKOY` verisi ama baş cümle çizilmez, yalnız olgu
    (aralık + "fark 5 dk · en uzun yol Deniz") kalır — `Fair`'le yan yana konunca fark görünür. */
export function Anchored() { return <Col><RangeBar venue={KARAKOY} travel={TRAVEL_ANCHORED} /></Col>; }
