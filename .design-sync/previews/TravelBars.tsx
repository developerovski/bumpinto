import type { ReactNode } from "react";
import { TravelBars } from "@bumpinto/web";
import { KARAKOY, TRAVEL } from "./_fixtures";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;
const Col = ({ children }: { children: ReactNode }) => <div style={COL}>{children}</div>;
// DÜZELTME: `slice(0, 2)` (SELF 19dk + ELIF 22dk) ikisi de 20dk'ya yuvarlanıyordu (spread 0) —
// eşit iki çubuktan biri id sıralamasıyla rastgele flame boyanıp "flame = en uzun" yanlış
// öğretiyordu. SELF (19→20) + DENIZ (26→25) gerçekten ayrışıyor; DENIZ'in çubuğu flame.
const TWO_LEG = { ...KARAKOY, travel: [KARAKOY.travel[0], KARAKOY.travel[2]] };

/** W6 · deste kartı gövdesi: kişi başı çubuk, üstlük yok (karta gömülü). */
export function Card() { return <Col><TravelBars venue={KARAKOY} travel={TRAVEL} /></Col>; }
/** W8 · karar ekranı sağ kartı: "Herkesin yolu" üstlüğüyle bağımsız kart. */
export function WithTitle() { return <Col><TravelBars venue={KARAKOY} travel={TRAVEL} title="Herkesin yolu" /></Col>; }
/** İki kişilik oturum — SELF 20dk (grass) / Deniz 25dk (flame, en uzun), "Herkese ~aynı ·
    fark 5 dk" (spread 5 ≤ SAME_FOR_ALL). */
export function TwoPeople() { return <Col><TravelBars venue={TWO_LEG} travel={TRAVEL} /></Col>; }
