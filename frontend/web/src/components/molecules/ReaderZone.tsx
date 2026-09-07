/* Okuma sütunu — yasal metin, atıflar, destek. `OneZone`'un aksine SOLA hizalıdır:
   ortalanmış paragraf uzun düzyazıda satır başlarını kaydırır ve okunmaz hale getirir
   (OneZone tek cümlelik hata ekranı içindir). Ölçü artboard W14/W15/W16 okuyucu sütunu. */
import type { ReactNode } from "react";

export default function ReaderZone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-3.5 text-left">{children}</div>
  );
}
