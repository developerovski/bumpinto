import { useEffect, useRef } from "react";
import { IdentityCard } from "@bumpinto/web";

/* `@bumpinto/shared` preview bundle'ında çözülmüyor (yalnız frontend/web/node_modules'te) —
   MeResponse'un ihtiyacımız olan alanları burada yerelde yeniden yazıldı
   (bkz. _fixtures.ts'teki aynı gerekçe / PastSessionRow.tsx aynı desen). */
type MeResponse = { id?: string; email?: string; displayName?: string };

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

const ME: MeResponse = {
  id: "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33",
  email: "mehmet@gmail.com",
  displayName: "Mehmet",
};

const ME_NO_NAME: MeResponse = {
  id: "a72f3c15-9d4e-4b60-b1a8-7e05f2c9d844",
  email: "deniz@gmail.com",
};

/** Görüntüleme hâli — avatar + ad, altında e-posta ve giriş yöntemi; sağda düzenle oku. */
export function View() {
  return (
    <div style={COL}>
      <IdentityCard me={ME} onSaveName={async () => {}} />
    </div>
  );
}

/** Hiç ad kaydedilmemiş — başlık e-postaya düşer, alt satır da AYNI e-postayı tekrar eder
    (ürün boşluğu: iki satır aynı bilgiyi taşıyor, ad girilene dek kaçınılmaz). */
export function NoDisplayName() {
  return (
    <div style={COL}>
      <IdentityCard me={ME_NO_NAME} onSaveName={async () => {}} />
    </div>
  );
}

/** `editing` yerel `useState` — dışarıdan prop değil, dolayısıyla düzenle okuna GERÇEKTEN
    tıklıyoruz (mount sonrası tek `useEffect`). Açılan satırda mevcut ad önceden dolu, metin
    alanının yanında "Kaydet" butonu. */
export function Editing() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label="Adını düzenle"]')?.click();
  }, []);
  return (
    <div ref={ref} style={COL}>
      <IdentityCard me={ME} onSaveName={async () => {}} />
    </div>
  );
}

/** Kaydetme sunucuda patladı — düzenle oku, ardından "Kaydet" GERÇEKTEN tıklanıp
    `onSaveName` reddedilince bileşenin kendi `error` state'i `ErrorText`'i basıyor;
    satır düzenleme modunda açık kalır. İki tıklama ayrı makro-görevlere bölünmüş
    (`setTimeout 0`) — aynı `useEffect` içinde arka arkaya çağrıldığında ikinci tıklama
    ilk `setEditing`in DOM'a yansımasından ÖNCE "Kaydet" düğmesini arıyor ve bulamıyordu
    (ölçüldü — ekran görüntüsünde hata metni hiç çıkmıyordu). */
export function SaveError() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelector<HTMLButtonElement>('button[aria-label="Adını düzenle"]')?.click();
    setTimeout(() => {
      Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
        .find((b) => b.textContent?.trim() === "Kaydet")
        ?.click();
    }, 0);
  }, []);
  return (
    <div ref={ref} style={COL}>
      <IdentityCard me={ME} onSaveName={async () => Promise.reject(new Error("network"))} />
    </div>
  );
}
