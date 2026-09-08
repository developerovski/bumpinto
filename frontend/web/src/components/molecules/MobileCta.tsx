import type { ReactNode } from "react";

/** Artboard 390 `.cta` — sayfa altına YAPIŞAN tam genişlik aksiyon (≥1024'te gizli, header
    CTA'sı kullanılır). Artboard'da `.cta` kaydırma alanının DIŞINDA, çerçevenin dibinde duran
    `flex:0 0 auto` bir ayaktır; `mt-auto` tek başına bunu vermiyor (üstündeki hiçbir kutu
    büyümüyorsa boşluk yok, düğme içeriğin peşine takılıyordu). `sticky bottom-0` aynı sonucu
    kabuk ölçüsünden bağımsız üretir: kısa sayfada dipte durur, uzun sayfada kaydırma boyunca
    görünür kalır. Kenar taşması sayfa gutter'ını (18px) iptal eder ki zemin tam genişlik olsun. */
export default function MobileCta({
  children,
  fade,
  voice,
}: {
  children: ReactNode;
  /** Ses denetimi (`<VoiceDock placement="strip" />`). Mobilde sayfanın aksiyonları BURADA
      yaşadığı için denetim de burada durur — masaüstünde başlık satırındaki ikizi basılır
      (kullanıcı kararı 2026-09-08: davet/karıştır nerede duruyorsa ses de orada dursun).
      Şeridin en ÜSTÜNDE: birincil eylem (Karıştır) parmağa en yakın yerde kalmalı. */
  voice?: ReactNode;
  /** Artboard `.f-fade` (367) — kaydırma alanının dibinde 56px'lik paper'a solma; listenin
      CTA'nın altında kesilmediğini, DEVAM ettiğini söyler (1601 / 1790 / 3322 / 4334).
      Şeridin kendi yüksekliği değişken olduğu için offset hesaplanmaz: solma CTA'nın
      ÜSTÜNE mutlak konumlanır, şerit ne kadar yüksek olursa olsun yerinde kalır. */
  fade?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-[7] mt-auto -mx-[1.125rem] flex flex-col gap-3 bg-paper px-[1.125rem] pt-3 pb-[0.875rem] lg:hidden">
      {fade && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-14 h-14 bg-gradient-to-b from-transparent to-paper"
        />
      )}
      {voice}
      {children}
    </div>
  );
}

/** Artboard 1280 sol bölge — masaüstünde görünen aksiyon (mobilde gizli, `.cta` yerini `MobileCta` tutar). */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden lg:flex lg:flex-col lg:gap-3">{children}</div>;
}
