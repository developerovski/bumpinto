/* Kaynak: artboard W20 · Bildirildi 390 — üst şerit kartı (.card + --grs-w) */
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../store/toastStore";

/** Tek bildirim yüzeyi (AppShell'de bir kez). `role="status"`: dürtme gibi kullanıcının KENDİ
    eylemi olmayan olaylar da ekran okuyucuya duyurulmalı. */
export default function ToastHost() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 top-[4.5rem] z-40 flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex w-full max-w-[26rem] items-center gap-2.5 rounded-card border px-3.5 py-2.5 shadow-sh1 ${
            toast.tone === "grass" ? "border-grass bg-grass-wash" : "border-flame bg-flame-wash"
          }`}
        >
          {toast.tone === "grass" ? (
            <CheckCircle size={20} className="flex-none text-grass" aria-hidden />
          ) : (
            <WarningCircle size={20} className="flex-none text-flame-deep" aria-hidden />
          )}
          <span className="flex-1 text-[0.875rem] font-bold">{t(toast.messageKey, toast.params)}</span>
          <button
            type="button"
            aria-label={t("common.close")}
            className="flex-none text-ink2"
            onClick={() => dismiss(toast.id)}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
