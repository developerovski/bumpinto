/* Artboard W18 · silme akışı AppShell DIŞINDA: gezinme, avatar ve altbilgi yok — kullanıcı
   yanlışlıkla akıştan çıkmasın; sayfa kurulumsuz ve girişsiz de açılabilmeli. */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../atoms";
import LangMenu from "../molecules/LangMenu";

export default function PlainShell(props: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center justify-between border-b border-line bg-paper px-[1.125rem] lg:h-16 lg:px-12">
        <Link to="/" className="text-ink no-underline"><Wordmark /></Link>
        <LangMenu />
      </header>
      {props.children}
    </div>
  );
}
