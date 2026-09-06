import { GoogleSignIn, Note } from "@bumpinto/web";

/* `VITE_GOOGLE_CLIENT_ID` preview ortamında tanımlı değil: esbuild `import.meta.env`i
   yalnız `{MODE,DEV,PROD,SSR,BASE_URL}` ile dolduruyor (bkz. .ds-sync/lib/common.mjs
   IIFE_IMPORT_META_DEFINE), VITE_ önekli hiçbir anahtar yok. Bileşenin `clientId`
   kontrolü bu yüzden HER ZAMAN `undefined`e düşüyor — script yükleme / login hata
   dalına preview'dan erişecek yol yok. Tek gerçek dal budur; sahte bir Google butonu
   çizmek yerine bileşenin kendi dürüst notunu ("Google girişi bu ortamda
   yapılandırılmadı.") gösteriyoruz. */
const WRAP = { background: "var(--color-paper)", padding: "1rem" } as const;

/** Tek başına — yapılandırılmamış Google girişi notu. Bileşenin tek erişilebilir dalı. */
export function Yapilandirilmamis() {
  return (
    <div style={WRAP}>
      <GoogleSignIn />
    </div>
  );
}

/** Landing sayfasındaki gerçek kompozisyon (`SignInBlock`, `molecules/SignInBlock.tsx`) —
    buton + altında "Koşulları" bağlantılı satır, gerçek 21.25rem genişlik sınırıyla.
    `SignInBlock` barrel'dan export edilmediği için aynı JSX burada birebir kuruldu. */
export function LandingKompozisyonu() {
  return (
    <div style={WRAP}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          width: "100%",
          maxWidth: "21.25rem",
        }}
      >
        <GoogleSignIn />
        <Note center>
          Devam edersen <a href="/terms">Koşulları</a> kabul etmiş olursun.
        </Note>
      </div>
    </div>
  );
}
