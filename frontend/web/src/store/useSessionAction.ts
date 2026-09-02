import { useState } from "react";
import { useTranslation } from "react-i18next";

/** Sayfa aksiyonu: tek çalıştırma kilidi + i18n hata anahtarı → metin (Lobi, Bireysel kurulum, Mekanlar). */
export function useSessionAction() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, errorKey: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(t(errorKey));
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error };
}
