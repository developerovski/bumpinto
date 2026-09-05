import { Button, DesktopOnly, Note } from "@bumpinto/web";
import { SignOut } from "@phosphor-icons/react";

/* `DesktopOnly` üretimde `hidden lg:flex` — yalnız ≥1024px'te görünür.
   Bu bileşenin çekimi cfg.overrides.DesktopOnly.viewport = "1280x700" ile GENİŞ
   yapılıyor, böylece gerçek `lg:` dalı hiçbir hile olmadan render oluyor.
   (İlk denemede `!important` ile görünürlük zorlanmıştı; gerçek dalı göstermek
   varken kartın yalan söylemesine gerek yok.) */
const FRAME = { width: "27.75rem" } as const;

/** Profil sayfası (`ProfilePage`) sol kolon kuyruğu — masaüstünde çıkış butonu buraya
    taşınır (mobilde yerini `MobileCta` alır). Tek gerçek kullanım: `kind="danger"`,
    `size="fit"` (içerik genişliğinde pill). */
export function Logout() {
  return (
    <div style={FRAME}>
      <DesktopOnly>
        <Button type="button" kind="danger" size="fit">
          <SignOut size={18} aria-hidden />
          Çıkış yap
        </Button>
      </DesktopOnly>
    </div>
  );
}

/** Aynı kuyruk, komşusuyla birlikte — `ProfilePage`'te `DesktopOnly`'den hemen önce
    gelen saklama notu. Sarmalayıcının komşu içerikle nasıl oturduğunu gösterir. */
export function WithRetentionNote() {
  return (
    <div style={{ ...FRAME, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Note card>
        Buluşmalar 24 saatte kapanır, 30 günde silinir. Katılanlardan yalnızca ad + konum
        tutulur — o kadar.
      </Note>
      <DesktopOnly>
        <Button type="button" kind="danger" size="fit">
          <SignOut size={18} aria-hidden />
          Çıkış yap
        </Button>
      </DesktopOnly>
    </div>
  );
}
