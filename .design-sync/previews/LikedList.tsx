import type { ReactNode } from "react";
import { LikedList } from "@bumpinto/web";
import { BALAT, BEBEK, DECK, KARAKOY, MODA, TRAVEL } from "./_fixtures";

/** W3 · DeckScreen sağ kolonu — Page(variant="deck") 480px kolon + TwoZone sağ bölge
    (`gap-4`), 900px çekim genişliğinde `lg:grid` devreye girmediği için bölgeler
    dikeyde istiflenir (ürünün kendi mobil davranışı — DeckScreen.tsx). */
function DeckColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-4 px-[1.125rem] pt-4">
      {children}
    </div>
  );
}

const SOME_LIKED = { [MODA.id]: true, [KARAKOY.id]: true };

/** W3 · iki mekan beğenilmiş: minimax sıraya göre (en adil önce) küçük görsel + puan +
    yol çubuğu, sağda gradyanlı onay tiki. */
export function SomeLiked() {
  return (
    <DeckColumn>
      <LikedList venues={DECK} liked={SOME_LIKED} travel={TRAVEL} />
    </DeckColumn>
  );
}

/** W3 · henüz kimse beğenilmedi: başlık + "0" sayaç, satır yok, yalnız alt not
    ("beğendiklerin burada birikir" türü kalibrasyon metni). */
export function Empty() {
  return (
    <DeckColumn>
      <LikedList venues={DECK} liked={{}} travel={TRAVEL} />
    </DeckColumn>
  );
}

/** ÜRÜN GERÇEĞİ (VenueDeck.tsx `WithoutTravelBadges` ile aynı kök neden): yol süreleri
    henüz hesaplanmadan gelen mekanlarda `travel[]` hiç yok — yol çubuğu `fairnessOf`/
    `RangeBar` içinde sessizce düşer, satır yalnız ad + puan/fiyatla kısa kalır. */
export function WithoutTravelBadges() {
  const noTravel = DECK.map(({ travel, ...rest }) => rest);
  return (
    <DeckColumn>
      <LikedList
        venues={noTravel}
        liked={{ [BEBEK.id]: true, [BALAT.id]: true }}
        travel={TRAVEL}
      />
    </DeckColumn>
  );
}
