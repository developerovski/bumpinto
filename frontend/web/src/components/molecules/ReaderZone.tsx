/* Okuma sütunu — yasal metin, atıflar, destek. `OneZone`'un aksine SOLA hizalıdır:
   ortalanmış paragraf uzun düzyazıda satır başlarını kaydırır ve okunmaz hale getirir
   (OneZone tek cümlelik hata ekranı içindir). Ölçü artboard W14/W15/W16 okuyucu sütunu. */
import type { ReactNode } from "react";

export default function ReaderZone({ children }: { children: ReactNode }) {
  return (
    /* Artboard W14 1280 okuyucu (4927): `.one` max-width 44rem, gap 11px. */
    <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-[0.6875rem] text-left">{children}</div>
  );
}
