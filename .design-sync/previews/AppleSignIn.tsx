import { AppleSignIn } from "@bumpinto/web";

/* GoogleSignIn.tsx'teki AYNI kök sebep: `VITE_APPLE_CLIENT_ID` preview ortamında tanımsız
   (esbuild `import.meta.env`i yalnız {MODE,DEV,PROD,SSR,BASE_URL} ile dolduruyor), bileşen
   HER ZAMAN `if (!clientId) return <Note>...</Note>` dalına düşüyor — sahte bir Apple butonu
   çizmek yerine bileşenin kendi dürüst notu gösteriliyor. Gerçek `SignInBlock` kompozisyonu
   (Google + Apple + koşul satırı) burada TEKRARLANMADI — GoogleSignIn.tsx'in
   `LandingKompozisyonu` hücresi güncellenip ikisi birlikte oraya taşındı (tek doğru kaynak,
   iki kopya değil). */
const WRAP = { background: "var(--color-paper)", padding: "1rem" } as const;

/** Tek başına — yapılandırılmamış Apple girişi notu. Bu ortamda erişilebilen tek dal. */
export function Yapilandirilmamis() {
  return (
    <div style={WRAP}>
      <AppleSignIn />
    </div>
  );
}
