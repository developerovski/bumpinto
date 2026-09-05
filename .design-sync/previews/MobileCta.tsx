import { Button, LinkButton, MobileCta } from "@bumpinto/web";
import { SignOut } from "@phosphor-icons/react";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk — `MobileCta`'nın gerçek
   ebeveyni her zaman `Page`. */
/* `MobileCta` kökü `mt-auto` taşıyor: gerçek ebeveyni `Page` (min-h-dvh flex kolon) ve
   aksiyon sayfanın DİBİNE yapışıyor. Düz bir div içinde `mt-auto`nun itebileceği boşluk
   olmadığı için ölçülen yükseklik 0px kalıyordu ([RENDER_THIN]). Çerçeve bu yüzden
   Page'in kolon geometrisini tekrar ediyor — taklit değil, gerçek ebeveyn koşulu. */
const FRAME = {
  width: "27.75rem",
  display: "flex",
  flexDirection: "column",
  minHeight: "16rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/** Oturumlar sayfası (`SessionsPage`) · sayfa altına yapışan tam genişlik CTA —
    `≥1024`'te gizlenir, masaüstünde header'daki "Yeni buluşma kur" linki kullanılır.
    900px çekim genişliği `lg` eşiğinin (1024) altında kaldığı için burada GÖRÜNÜR. */
export function NewSessionCta() {
  return (
    <div style={FRAME}>
      <MobileCta>
        <LinkButton href="/sessions/new">Yeni buluşma kur</LinkButton>
      </MobileCta>
    </div>
  );
}

/** Profil sayfası (`ProfilePage`) · çıkış aksiyonu — masaüstünde aynı buton
    `DesktopOnly` ile sol kolona taşınıyor, mobilde tek görünen yer burası. */
export function LogoutCta() {
  return (
    <div style={FRAME}>
      <MobileCta>
        <Button type="button" kind="danger" size="md">
          <SignOut size={18} aria-hidden />
          Çıkış yap
        </Button>
      </MobileCta>
    </div>
  );
}
