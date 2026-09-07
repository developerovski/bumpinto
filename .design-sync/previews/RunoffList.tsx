import type { ReactNode } from "react";
import { RunoffList } from "@bumpinto/web";
import { BEBEK, KARAKOY, TRAVEL } from "./_fixtures";

/* İkisini de herkes beğendi → finale kalan iki mekân. `deckOrder` tek/çift olduğu için
   kartlar artboard'daki gibi ters yönde eğik durur (-2° / +2°). Fixtures artık `travel[]`
   taşıdığı için finalist kartları kendi yol çubuğunu (`RangeBar`/`TravelBars`) basar. */
const FINALISTS = [KARAKOY, BEBEK];

/** 07 Runoff sayfa sütunu — Page(default) ölçüleri: 480px kolon, 15px dikey ritim. */
function Column({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-[0.9375rem] px-[1.125rem] py-5">
      {children}
    </div>
  );
}

/** 07 Runoff · ekran açıldığında: iki finalist eşit ağırlıkta, seçim dairesi boş.
    HTTP/CTA/not bu bileşende DEĞİL, `RunoffStatus`'ta. */
export function Undecided() {
  return (
    <Column>
      <RunoffList
        finalists={FINALISTS}
        choice={null}
        onChoose={() => {}}
        disabled={false}
        travel={TRAVEL}
      />
    </Column>
  );
}

/** İlk finalist seçili — kart flame kenarlığa geçer, daire gradyan dolgu + beyaz tik alır.
    Diğeri sönümlenmez; ayrım tamamen kenarlık ve tikte. */
export function PickedFirst() {
  return (
    <Column>
      <RunoffList
        finalists={FINALISTS}
        choice={KARAKOY.id}
        onChoose={() => {}}
        disabled={false}
        travel={TRAVEL}
      />
    </Column>
  );
}

/** İkinci finalist seçili. */
export function PickedSecond() {
  return (
    <Column>
      <RunoffList
        finalists={FINALISTS}
        choice={BEBEK.id}
        onChoose={() => {}}
        disabled={false}
        travel={TRAVEL}
      />
    </Column>
  );
}

/** Karışık deste — oturum >1 ilgi alanı taşıyorsa finalist kartları kendi
    kategori rozetlerini basar. */
export function MixedDeck() {
  return (
    <Column>
      <RunoffList
        finalists={FINALISTS}
        choice={null}
        onChoose={() => {}}
        disabled={false}
        travel={TRAVEL}
        mixedDeck
      />
    </Column>
  );
}
