import { useEffect, useRef } from "react";
import { LangMenu } from "@bumpinto/web";

/* LangMenu her zaman TopBar'ın sağındaki nav içinde oturuyor (`<nav className="flex
   items-center gap-2.5"><LangMenu/></nav>`, sağa yaslı). Tek başına kartta da aynı
   sağa-yaslı konumu koruyoruz ki popover'ın `right-0` hizası gerçek bağlamıyla eşleşsin. */
const WRAP = {
  background: "var(--color-paper)",
  padding: "0.875rem 1.125rem",
  display: "flex",
  justifyContent: "flex-end",
} as const;

/** Kapalı hâl — "TR ▾" pill'i, i18n'in sabitlendiği varsayılan dili (Türkçe) gösteriyor. */
export function Kapali() {
  return (
    <div style={WRAP}>
      <LangMenu />
    </div>
  );
}

/** Açık hâl — `open` bileşenin kendi `useState`'i, dışarıdan prop değil; sahte bir menü
    çizmek yerine kendi `aria-label="Dil seç"` düğmesine mount sonrası GERÇEK tıklama
    uygulanıyor. Üç dil satırı + geçerli dilin (Türkçe) yanında onay ikonu. */
export function Acik() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label="Dil seç"]')?.click();
  }, []);
  return (
    <div ref={ref} style={WRAP}>
      <LangMenu />
    </div>
  );
}
