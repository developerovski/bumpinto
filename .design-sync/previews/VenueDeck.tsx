import type { ReactNode } from "react";
import { VenueDeck } from "@bumpinto/web";

// travel[] katılımcı UUID'sini participantId olarak taşır — etiketler aynı anahtarlarla eşleşmeli.
const SELF = "8f2c1a44-3d5e-4b17-9c0a-2e6b7d4f1a90";
const ELIF = "b31d9e70-6a42-4f8c-8d55-1c07a9be3d21";

/** DeckScreen'in kurduğu eşleme: kendi satırın "Sana", diğerleri adıyla. */
const TRAVEL_LABELS = { [SELF]: "Sana", [ELIF]: "Elif" };
const TRAVEL = { labels: TRAVEL_LABELS, selfId: SELF };

const MODA = {
  id: "9d1f0c2a-77b4-4e18-96c1-0a5b3e7d2f44",
  name: "Moda Sahil",
  rating: 4.6,
  deckOrder: 0,
  travel: [
    { participantId: SELF, minutes: 22 },
    { participantId: ELIF, minutes: 31 },
  ],
};
const KARAKOY = {
  id: "c6a83b51-2e94-4f70-8d2b-61c9f4a0e7d3",
  name: "Karaköy Lokantası",
  rating: 4.5,
  priceLevel: 3,
  deckOrder: 1,
  travel: [
    { participantId: SELF, minutes: 28 },
    { participantId: ELIF, minutes: 19 },
  ],
};
const BEBEK = {
  id: "17e5d9c8-4b30-42a6-b5f1-8c02d6e93a15",
  name: "Bebek Kahve",
  rating: 4.4,
  priceLevel: 2,
  deckOrder: 2,
  travel: [
    { participantId: SELF, minutes: 34 },
    { participantId: ELIF, minutes: 26 },
  ],
};
const BALAT = {
  id: "e0b72f46-8a15-4c93-9d7e-3f61a8c05b29",
  name: "Balat Kahvesi",
  rating: 4.7,
  priceLevel: 2,
  deckOrder: 3,
  travel: [
    { participantId: SELF, minutes: 41 },
    { participantId: ELIF, minutes: 23 },
  ],
};

/* DÜZELTİLDİ (2026-09-07): bu hücre eskiden "deste yuvası sabit h-[27.5rem], ön kart onu aşıp
   DeckActions'ın üstüne biniyor" diyordu. Artık doğru değil — organisms/VenueDeck.tsx'teki
   `DECK` sınıfı sabit yüksekliği bıraktı (`"relative flex-none"`; yalnız arka d2/d3 katmanları
   `!absolute`), kap yüksekliği ön karttan geliyor. FullStack/LastTwo/FinalCard bunu kanıtlıyor:
   TravelBars satırı render olsa da DeckActions'ın üstüne binmiyor. */

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
      <VenueDeck venues={[MODA, KARAKOY, BEBEK, BALAT]} travel={TRAVEL} />
    </DeckColumn>
  );
}

/** W3 · deste tükenirken: arkada tek kart kaldı, yığın iki katmana iner, çubuk yarıda. */
export function LastTwo() {
  return (
    <DeckColumn>
      <VenueDeck venues={[BEBEK, BALAT]} travel={TRAVEL} />
    </DeckColumn>
  );
}

/** W3 · son kart: arka katman yok, hafif eğik tek polaroid, çubuk dolu.
    Geri al düğmesi aynı yerde durur — deste bittikten sonra devreye girer. */
export function FinalCard() {
  return (
    <DeckColumn>
      <VenueDeck venues={[KARAKOY]} travel={TRAVEL} />
    </DeckColumn>
  );
}

/** W3 · yol süreleri henüz hesaplanmadan gelen deste — `TravelBars` satırı hiç basılmaz
    (`fairnessOf` boş `travel[]`de `null` döner), kart yalnız ad + puan/fiyat ile daha kısa durur. */
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
