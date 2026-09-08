/* Kaynak: artboard W2b 390 (3949–3972) — `.scrim` + `.sheet`: karartma, tutamaç (`.grab`),
   `.h3` başlık, 28px üst köşeler, `0 -12px 40px` gölge. PersonSheet/MeetTimeDialog kendi
   panellerini elle kuruyor; bu molekül DS'in ADLANDIRILMIŞ alt sayfasıdır (tutamaç + başlık +
   odak tuzağı) ve harita seçici gibi "arkadaki form kilitlenmeli" akışlar için vardır. */
import { useEffect, useRef, type ReactNode } from "react";

const PANEL =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[26rem] flex-col gap-3 " +
  "rounded-t-[1.75rem] bg-card p-[0.625rem_1.25rem_1.625rem] " +
  "shadow-[0_-12px_40px_rgba(39,32,59,0.2)] outline-none";

/* Odak sırası için: gizli/pasif olmayan tüm doğal odak hedefleri. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const onClose = props.onClose;

  // Açılışta odak panele: yoksa odak arkadaki formda kalır ve klavye kullanıcısı
  // görmediği alanlarda dolaşır.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Odak tuzağı: `aria-modal` yalnız yardımcı teknolojiye "arkası yok" der, Tab'i
      // durdurmaz — sekme sırası panelin içinde döner.
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && active === last) {
        first.focus();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(39,32,59,0.42)]" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={props.title} tabIndex={-1} className={PANEL}>
        <span className="mx-auto mb-1 block h-[5px] w-10 rounded-[3px] bg-line2" aria-hidden />
        <h3>{props.title}</h3>
        {props.children}
      </div>
    </>
  );
}
