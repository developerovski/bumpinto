import type { ReactNode } from "react";
import { DeckProgressNote } from "@bumpinto/web";
import { ELIF_P, MEHMET, SELIN_P } from "./_fixtures";

/** W3 · DeckScreen sağ kolonu, `LikedList`in hemen altı — Page(variant="deck") 480px kolon. */
function DeckColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-4 px-[1.125rem] pt-4">
      {children}
    </div>
  );
}

// Deniz konumunu atmamış (`hasLocation: false`) → `votersOf` onu süzüyor, üçü de
// "present" listesinde: Mehmet (kendisi) + Elif + Selin.
const SELF_NAME = MEHMET.displayName;

/** W3 · diğer herkes bitirdi, viewer (Mehmet) geride kaldı: tek satır el yazısı not —
    sayaç/"geç" etiketi yok (§4.8), yalnız ad + kalan kart sayısı. Kart kutusu YOK — bu
    dalın kasıtlı tasarımı bu kadar sade. */
export function Laggard() {
  return (
    <DeckColumn>
      <DeckProgressNote
        participants={[
          MEHMET,
          { ...ELIF_P, deckDone: true },
          { ...SELIN_P, deckDone: true },
        ]}
        selfId={MEHMET.id}
        selfName={SELF_NAME}
        remaining={2}
      />
    </DeckColumn>
  );
}

/** W3 · deste yeni açıldı, kimse bitirmedi: kart yalnız üst üste binen avatar halkasını
    basar (hepsi "bekliyor" — kesikli kenar, kum rengi), açıklama satırı yok. */
export function Starting() {
  return (
    <DeckColumn>
      <DeckProgressNote
        participants={[
          MEHMET,
          { ...ELIF_P, deckDone: false },
          { ...SELIN_P, deckDone: false },
        ]}
        selfId={MEHMET.id}
        selfName={SELF_NAME}
        remaining={4}
      />
    </DeckColumn>
  );
}

/** W3 · karışık: Elif bitirdi (dolu avatar), Selin hâlâ kaydırıyor (bekleme avatarı).
    ÜRÜN GERÇEĞİ: açıklama satırı (`deck.progressLine`) `hidden lg:block` — 900px çekim
    genişliğinde (< 1024 `lg` eşiği) basılmaz, tıpkı gerçek dar ekranda olduğu gibi;
    bilgi avatarların kendi hâliyle taşınıyor. */
export function Mixed() {
  return (
    <DeckColumn>
      <DeckProgressNote
        participants={[
          MEHMET,
          { ...ELIF_P, deckDone: true },
          { ...SELIN_P, deckDone: false },
        ]}
        selfId={MEHMET.id}
        selfName={SELF_NAME}
        remaining={3}
      />
    </DeckColumn>
  );
}
