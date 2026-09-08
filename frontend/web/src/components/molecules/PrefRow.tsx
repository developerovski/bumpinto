import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Artboard W9 · Profil tercih satırı — konum/etkinlik/ulaşım açılır panelli.
    390 (2792-2814) satırları `.srow.st`: solda 32px `#F4EEE6` ikon karosu var, 1280 (2678+)
    satırlarında YOK — bu yüzden karo `lg:hidden`. */
export default function PrefRow({ label, value, icon, aside, open, onToggle, children }: {
  label: string;
  value: ReactNode;
  /** 390 ikon karosunun içeriği (ph-map-pin, ph-coffee, ph-car…). */
  icon?: ReactNode;
  aside?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const shown = value ?? t("profile.unset");
  const content = (
    <>
      {icon && (
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[0.625rem] bg-sand text-[1.0625rem] text-ink2 lg:hidden"
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="flex flex-1 flex-col items-start gap-0.5 text-left">
        {/* Artboard etiket ağırlığı 700 (`.lb` + inline font-weight:700). */}
        <span className="text-[0.875rem] font-bold">{label}</span>
        <span className="text-[0.75rem] text-ink2">{shown}</span>
      </span>
      {aside}
      <CaretRight size={16} className={`flex-none text-ink3 ${open ? "rotate-90" : ""}`} aria-hidden />
    </>
  );
  return (
    <div>
      {onToggle ? (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-[1.125rem] py-3.5"
          aria-expanded={open}
          onClick={onToggle}
        >
          {content}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 px-[1.125rem] py-3.5">{content}</div>
      )}
      {open && children}
    </div>
  );
}
