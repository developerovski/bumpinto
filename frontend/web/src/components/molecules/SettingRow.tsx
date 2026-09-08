/* Artboard W13/O8 .srow.st — ikon + etiket (+alt satır) + sağda caret ya da anahtar.
   Üç kullanım: bağlantı (`to`), eylem (`onClick`), salt bilgi/anahtar (`aside`). */
import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* Dikey dolgu kırılımlı: artboard 390'da 7px'e iner (4813 vb. — dört bölüm tek ekrana
   sığsın diye), 1280'de 12px'tir (`.srow.st`, CSS 521). */
const ROW = "flex w-full items-center gap-3 px-4 py-[0.4375rem] text-left no-underline lg:py-3";
const ICON = "flex h-8 w-8 flex-none items-center justify-center rounded-[0.625rem] bg-sand text-[1.0625rem]";

export default function SettingRow(props: {
  icon: ReactNode; label: string; hint?: string;
  to?: string; onClick?: () => void; aside?: ReactNode; danger?: boolean; disabled?: boolean;
}) {
  const body = (
    <>
      <span className={`${ICON} ${props.danger ? "text-danger" : "text-ink2"}`} aria-hidden>{props.icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-[0.875rem] font-bold ${props.danger ? "text-danger" : "text-ink"}`}>{props.label}</span>
        {props.hint && <span className="text-[0.75rem] leading-normal text-ink2">{props.hint}</span>}
      </span>
      {/* Artboard 4732: satır sonu chevron ink3 (ink2 fazla koyuydu). */}
      {props.aside ?? <CaretRight size={16} className="flex-none text-ink3" aria-hidden />}
    </>
  );
  return (
    <li className="flex">
      {props.to ? (
        <Link to={props.to} className={`${ROW} text-ink`}>{body}</Link>
      ) : props.onClick ? (
        <button type="button" className={ROW} disabled={props.disabled} onClick={props.onClick}>{body}</button>
      ) : (
        <div className={ROW}>{body}</div>
      )}
    </li>
  );
}
