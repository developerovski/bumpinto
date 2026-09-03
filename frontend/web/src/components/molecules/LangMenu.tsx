/* Kaynak: DS v2 §06 — .lg pill + .pop popover; artboard TR ▾ */
import { CaretDown, Check, Globe } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { LANGUAGES } from "../../lib/languages";
import { useAuthStore } from "../../store/authStore";


const PILL =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line2 " +
  "bg-white px-3 font-head text-[0.8125rem] font-bold text-ink";
const POP =
  "absolute right-0 top-[2.875rem] z-20 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl " +
  "border border-line bg-white p-1.5 shadow-sh2";
const ROW = "flex cursor-pointer items-center justify-between rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] font-semibold";

export default function LangMenu() {
  const { t, i18n } = useTranslation();
  const cur = i18n.resolvedLanguage ?? i18n.language;
  const [open, setOpen] = useState(false);
  const [, setParams] = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const updatePrefs = useAuthStore((s) => s.updatePrefs);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function choose(code: string) {
    setOpen(false);
    await i18n.changeLanguage(code);
    // Anonim: seçim URL'de yaşar (storage'a yazma yok). Giriş varsa sunucuda da tutulur.
    setParams((p) => { p.set("lng", code); return p; }, { replace: true });
    if (status === "signed") {
      try {
        await updatePrefs({ language: code });
      } catch {
        /* dil URL'de zaten kalıcı */
      }
    }
  }

  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button type="button" ref={triggerRef} className={PILL} aria-label={t("shell.langAria")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Globe size={15} className="text-ink2" aria-hidden />
        {cur.slice(0, 2).toUpperCase()}
        <CaretDown size={15} className="text-ink2" aria-hidden />
      </button>
      {open && (
        <div className={POP} role="menu">
          {LANGUAGES.map((l) => {
            const on = cur.startsWith(l.code);
            return (
              <button key={l.code} type="button" role="menuitem" className={`${ROW} ${on ? "bg-flame-wash text-flame-deep" : "text-ink"}`} onClick={() => void choose(l.code)}>
                {l.label}
                {on && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
