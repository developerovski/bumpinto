import type { ReactNode } from "react";
import { ParticipantList } from "@bumpinto/web";

// Katılımcı kimlikleri sunucudan UUID gelir; satırda görünmez, yalnız key/eşleme içindir.
const MEHMET = "8f2c1a44-3d5e-4b17-9c0a-2e6b7d4f1a90";
const ELIF = "b31d9e70-6a42-4f8c-8d55-1c07a9be3d21";
const DENIZ = "5c40f8b2-91ad-4e63-a712-4d8f0b6c5e33";
const SELIN = "2a7e6d18-c054-49fb-8b3d-7f19e2c4a608";

/** W2 sayfa sütunu — Page(default) ölçüleri: 480px kolon, 15px dikey ritim. */
function Column({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-[0.9375rem] px-[1.125rem] py-5">
      {children}
    </div>
  );
}

/** W2 · buluşma toplanırken: kuran hazır, biri hazır, ikisi hâlâ konum bekliyor.
    Sayaç ve ilerleme çubuğu `hasLocation` sayısından türer — 2/4 → %50. */
export function MidSession() {
  return (
    <Column>
      <ParticipantList
        participants={[
          { id: MEHMET, displayName: "Mehmet", host: true, hasLocation: true },
          { id: ELIF, displayName: "Elif", hasLocation: true },
          { id: DENIZ, displayName: "Deniz", hasLocation: false },
          { id: SELIN, displayName: "Selin", hasLocation: false },
        ]}
      />
    </Column>
  );
}

/** W2 · herkes konumunu attı — 4/4, çubuk dolu, tüm avatarlar hikaye halkalı.
    "Konum bekleniyor…" alt satırı düşer; kuran satırı nötr "Kuran" rozetinde kalır. */
export function AllReady() {
  return (
    <Column>
      <ParticipantList
        participants={[
          { id: MEHMET, displayName: "Mehmet", host: true, hasLocation: true },
          { id: ELIF, displayName: "Elif", hasLocation: true },
          { id: DENIZ, displayName: "Deniz", hasLocation: true },
          { id: SELIN, displayName: "Selin", hasLocation: true },
        ]}
      />
    </Column>
  );
}

/** W2 · linkin ilk dakikası: yalnız kuran ve yeni katılan biri — 1/2.
    Kesikli çerçeveli "bekliyor" avatarı bu boyda en okunur hâliyle görünür. */
export function EarlyPair() {
  return (
    <Column>
      <ParticipantList
        participants={[
          { id: MEHMET, displayName: "Mehmet", host: true, hasLocation: true },
          { id: DENIZ, displayName: "Deniz", hasLocation: false },
        ]}
      />
    </Column>
  );
}
