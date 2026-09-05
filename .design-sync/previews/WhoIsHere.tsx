import type { ReactNode } from "react";
import { WhoIsHere } from "@bumpinto/web";
import { DENIZ_P, ELIF_P, MEHMET, SELIN_P } from "./_fixtures";

/** W1 · JoinForm sağ kolonu — Page(varsayılan) 480px kolon + TwoZone sağ bölge. */
function JoinColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-[0.9375rem] px-[1.125rem] pt-5">
      {children}
    </div>
  );
}

/* `children` (gerçek kullanımda MapView, lazy + Google Maps) BİLİNÇLİ ATLANDI: ağ bağımlı,
   sandbox'ta yüklenmez (`photoUrl` dış URL'lerinin atlanma nedeniyle aynı). WhoIsHere'in
   KENDİ görünümü (kart + avatar sırası + el yazısı not) etkilenmiyor — çocuk, kartın
   ALTINDA ayrı render olur. */

/** W1 · ikisi de konumunu attı: kart "2/2 hazır" + halkalı avatarlar + isim listesi
    ("Mehmet ve Elif konumunu attı" türü kopya). */
export function ReadyPair() {
  return (
    <JoinColumn>
      <WhoIsHere participants={[MEHMET, ELIF_P]} />
    </JoinColumn>
  );
}

/** W1 · karışık: üç kişi hazır, Deniz henüz atmadı — soluk/kesikli kenarlı bekleme avatarı
    sıraya karışıyor, sayaç "3/4". */
export function Mixed() {
  return (
    <JoinColumn>
      <WhoIsHere participants={[MEHMET, ELIF_P, DENIZ_P, SELIN_P]} />
    </JoinColumn>
  );
}

/** W1 · henüz kimse katılmadı: hazır kartı hiç basılmıyor (`participants.length > 0` şartı),
    yalnız altta el yazısı davet notu kalıyor. */
export function Empty() {
  return (
    <JoinColumn>
      <WhoIsHere participants={[]} />
    </JoinColumn>
  );
}
