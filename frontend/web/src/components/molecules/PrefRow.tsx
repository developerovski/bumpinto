import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Artboard W9 · Profil tercih satırı — Dil açılır panelli, konum/etkinlik salt bilgi (W-4'e dek). */
export default function PrefRow({ label, value, aside, open, onToggle, children }: {
  label: string;
  value: ReactNode;
  aside?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const shown = value ?? t("profile.unset");
  const content = (
    <>
      <span className="flex flex-1 flex-col items-start gap-0.5 text-left">
        <span className="text-[0.875rem] font-semibold">{label}</span>
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
