import type { ReactNode } from "react";
import { VenueDeck } from "@bumpinto/web";

// travelMinutes katılımcı UUID'siyle anahtarlı — etiketler aynı anahtarlarla eşleşmeli.
const SELF = "8f2c1a44-3d5e-4b17-9c0a-2e6b7d4f1a90";
const ELIF = "b31d9e70-6a42-4f8c-8d55-1c07a9be3d21";

/** DeckScreen'in kurduğu eşleme: kendi satırın "Sana", diğerleri adıyla. */
const TRAVEL_LABELS = { [SELF]: "Sana", [ELIF]: "Elif" };

const MODA = {
  id: "9d1f0c2a-77b4-4e18-96c1-0a5b3e7d2f44",
  name: "Moda Sahil",
  rating: 4.6,
  deckOrder: 0,
  travelMinutes: { [SELF]: 22, [ELIF]: 31 },
};
const KARAKOY = {
  id: "c6a83b51-2e94-4f70-8d2b-61c9f4a0e7d3",
  name: "Karaköy Lokantası",
  rating: 4.5,
  priceLevel: 3,
  deckOrder: 1,
  travelMinutes: { [SELF]: 28, [ELIF]: 19 },
};
const BEBEK = {
  id: "17e5d9c8-4b30-42a6-b5f1-8c02d6e93a15",
  name: "Bebek Kahve",
  rating: 4.4,
  priceLevel: 2,
  deckOrder: 2,
  travelMinutes: { [SELF]: 34, [ELIF]: 26 },
};
const BALAT = {
  id: "e0b72f46-8a15-4c93-9d7e-3f61a8c05b29",
  name: "Balat Kahvesi",
  rating: 4.7,
  priceLevel: 2,
  deckOrder: 3,
  travelMinutes: { [SELF]: 41, [ELIF]: 23 },
};

/** W3 sayfa sütunu — Page(variant="deck") ölçüleri: 480px kolon, aralıksız yığın. */
function DeckColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col px-[1.125rem] pt-4">{children}</div>
  );
}

/** W3 · destenin açılış hâli: üç katmanlı yığın (ön kart tam, arkadakiler yalnız
    fotoğraf alanı), çubuk 1/4'te, altta geri al · geç · beğen ve klavye ipucu.
    Kaydırma bir etkileşim — statik kare yığının duruş hâlini gösterir. */
export function FullStack() {
  return (
    <DeckColumn>
      <VenueDeck venues={[MODA, KARAKOY, BEBEK, BALAT]} travelLabels={TRAVEL_LABELS} />
    </DeckColumn>
  );
}

/** W3 · deste tükenirken: arkada tek kart kaldı, yığın iki katmana iner, çubuk yarıda. */
export function LastTwo() {
  return (
    <DeckColumn>
      <VenueDeck venues={[BEBEK, BALAT]} travelLabels={TRAVEL_LABELS} />
    </DeckColumn>
  );
}

/** W3 · son kart: arka katman yok, hafif eğik tek polaroid, çubuk dolu.
    Geri al düğmesi aynı yerde durur — deste bittikten sonra devreye girer. */
export function FinalCard() {
  return (
    <DeckColumn>
      <VenueDeck venues={[KARAKOY]} travelLabels={TRAVEL_LABELS} />
    </DeckColumn>
  );
}

/** W3 · yol süreleri henüz hesaplanmadan gelen deste — rozet satırı düşer,
    kart yalnız ad + puan/fiyat ile daha kısa durur. */
export function WithoutTravelBadges() {
  return (
    <DeckColumn>
      <VenueDeck
        venues={[
          { id: MODA.id, name: MODA.name, rating: 4.6, deckOrder: 0 },
          { id: KARAKOY.id, name: KARAKOY.name, rating: 4.5, priceLevel: 3, deckOrder: 1 },
          { id: BEBEK.id, name: BEBEK.name, rating: 4.4, priceLevel: 2, deckOrder: 2 },
        ]}
      />
    </DeckColumn>
  );
}
