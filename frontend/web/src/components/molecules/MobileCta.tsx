import type { ReactNode } from "react";

/** Artboard 390 `.cta` — sayfa altına YAPIŞAN tam genişlik aksiyon (≥1024'te gizli, header
    CTA'sı kullanılır). Artboard'da `.cta` kaydırma alanının DIŞINDA, çerçevenin dibinde duran
    `flex:0 0 auto` bir ayaktır; `mt-auto` tek başına bunu vermiyor (üstündeki hiçbir kutu
    büyümüyorsa boşluk yok, düğme içeriğin peşine takılıyordu). `sticky bottom-0` aynı sonucu
    kabuk ölçüsünden bağımsız üretir: kısa sayfada dipte durur, uzun sayfada kaydırma boyunca
    görünür kalır. Kenar taşması sayfa gutter'ını (18px) iptal eder ki zemin tam genişlik olsun. */
export default function MobileCta({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-[7] mt-auto -mx-[1.125rem] flex flex-col gap-3 bg-paper px-[1.125rem] pt-3 pb-[0.875rem] lg:hidden">
      {children}
    </div>
  );
}

/** Artboard 1280 sol bölge — masaüstünde görünen aksiyon (mobilde gizli, `.cta` yerini `MobileCta` tutar). */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden lg:flex lg:flex-col lg:gap-3">{children}</div>;
}
