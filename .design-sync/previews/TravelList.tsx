import type { ReactNode } from "react";
import { TravelList } from "@bumpinto/web";
import { ELIF, ELIF_P, DENIZ_P, KARAKOY, MEHMET, SELF } from "./_fixtures";

/** W4 · ResultScreen sağ kolonu — Page(variant="result") 480px kolon + TwoZone sağ bölge,
    aynı 900px genişlikte dikey istif (ResultScreen.tsx `right` bölümü). */
function ResultColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-3.5 px-[1.125rem] pt-5">
      {children}
    </div>
  );
}

const ROWS = [MEHMET, ELIF_P, DENIZ_P];

/** W4 · kazanan mekanın yol süresi listesi — herkes (davetli dahil, konum atmamış olsa bile
    `travelMinutes` varsa satırda), kendi satırın en üstte "Sana" etiketiyle, gerisi adıyla. */
export function SelfFirst() {
  return (
    <ResultColumn>
      <TravelList venue={KARAKOY} participants={ROWS} selfId={SELF} />
    </ResultColumn>
  );
}

/** ÜRÜN GERÇEĞİ: sıralama + "Sana" etiketi `selfId`e göre türer, ada göre değil — davet
    linkini açan farklı bir katılımcı olduğunda (burada Elif) üstteki satır ve etiket değişir,
    Mehmet düz adıyla listeye döner. */
export function OtherAsSelf() {
  return (
    <ResultColumn>
      <TravelList venue={KARAKOY} participants={ROWS} selfId={ELIF} />
    </ResultColumn>
  );
}
