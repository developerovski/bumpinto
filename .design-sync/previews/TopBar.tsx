import { useEffect, useRef } from "react";
import { TopBar } from "@bumpinto/web";

/* TopBar `status`'u `useAuthStore`dan okuyor (bkz. kaynak: "../../store/authStore").
   Store barrel'dan (`components/index.ts`) export edilmiyor VE gerçek uygulamada
   `main.tsx`'in mount-anı `useAuthStore.getState().load()` çağrısı bu preview
   ortamında hiç çalışmıyor — bu yüzden `status` burada her zaman varsayılan
   "unknown" kalıyor (W5 learnings'teki RequireAuth/AvatarMenu ile AYNI kök sebep).
   Görünür sonuç "anon" ile birebir aynı: yalnız marka + dil pill'i: "Oturumlar"
   bağlantısı ve AvatarMenu yalnız `status === "signed"` dalında çıkıyor, buraya
   erişim yok. Bu TopBar.test.tsx'in "anonim" senaryosuyla birebir örtüşüyor. */
const WRAP = { background: "var(--color-paper)", padding: "0.5rem 0" } as const;

/** Varsayılan (ve bu ortamda tek erişilebilir) durum — anonim üst çubuk: marka solda,
    dil pill'i sağda. "Oturumlar" bağlantısı + hesap menüsü store izolasyonu yüzünden
    buradan tetiklenemiyor (yukarıdaki not). */
export function Anonim() {
  return (
    <div style={WRAP}>
      <TopBar />
    </div>
  );
}

/** Dil menüsü açıkken üst çubuk — LangMenu kendi `aria-label="Dil seç"` düğmesine GERÇEK
    tıklama ile açılıyor (mount `useEffect`, taklit markup yok). Popover üst çubuğun sağ
    üst köşesinden aşağı açılıyor, geçerli dil (Türkçe) işaretli. */
export function DilMenusuAcik() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label="Dil seç"]')?.click();
  }, []);
  return (
    <div ref={ref} style={WRAP}>
      <TopBar />
    </div>
  );
}
