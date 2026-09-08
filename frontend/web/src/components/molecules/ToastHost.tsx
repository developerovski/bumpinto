/* Kaynak: artboard W20 · Bildirildi 390 — üst şerit kartı (.card + --grs-w) */
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../store/toastStore";

/* Artboard 5821: şerit `left/right:18px`, `top:124px`. 124px maketin SAHTE tarayıcı şeridini
   (`.brc` 64px) içerir; gerçek uygulamada karşılığı uygulama çubuğunun 4px altı →
   56+4 = 60px (mobil), `lg`'de çubuk 64px olduğundan 68px (bkz. TopBar `h-14 lg:h-16`). */
const HOST =
  "pointer-events-none fixed inset-x-[1.125rem] top-[3.75rem] z-40 flex flex-col items-center gap-2 lg:top-[4.25rem]";
/* `--grs-w` zemin + `#BFE5CF` kenarlık: tam güçte `border-grass` tasarımda yok (soluk yıkama). */
const GRASS = "border-[#bfe5cf] bg-grass-wash";
const FLAME = "border-flame bg-flame-wash";

/** Tek bildirim yüzeyi (AppShell'de bir kez). `role="status"`: dürtme gibi kullanıcının KENDİ
    eylemi olmayan olaylar da ekran okuyucuya duyurulmalı. */
export default function ToastHost() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className={HOST}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex w-full max-w-[26rem] items-center gap-2.5 rounded-card border px-3.5 py-2.5 shadow-sh1 ${
            toast.tone === "grass" ? GRASS : FLAME
          }`}
        >
          {toast.tone === "grass" ? (
            <CheckCircle size={20} className="flex-none text-grass" aria-hidden />
          ) : (
            <WarningCircle size={20} className="flex-none text-flame-deep" aria-hidden />
          )}
          <span className="flex-1 text-[0.875rem] font-bold">{t(toast.messageKey, toast.params)}</span>
          {/* Onay şeridinde kapatma yok (artboard 5821-5825): 5 sn sonra kendi kapanır. Hata
              tonunda kalıyor — kullanıcı okumayı bitirmeden kaybolmasın diye elle atılabilmeli. */}
          {toast.tone !== "grass" && (
            <button
              type="button"
              aria-label={t("common.close")}
              className="flex-none text-ink2"
              onClick={() => dismiss(toast.id)}
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
