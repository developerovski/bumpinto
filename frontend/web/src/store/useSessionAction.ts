import { useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

/** Sayfa aksiyonu: tek çalıştırma kilidi + i18n hata anahtarı → metin (Lobi, Bireysel kurulum, Mekanlar).

    `byServerError` sunucunun `{error}` gövdesindeki metne bakar, HTTP koduna DEĞİL: aynı 409 hem
    "oturumda tek kişisin" hem "durum artık BROWSING değil" olabilir ve ikisine aynı metni basmak
    host'a yanlış bilgi verir — üstelik geri alınamaz bir çıkışa (force-decision) yönlendirir.
    Eşleşen parça sunucunun mesajıdır ve backend testiyle kilitlidir (DeckFlowTest). */
export function useSessionAction() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: () => Promise<void>,
    errorKey: string,
    byServerError?: Record<string, string>,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      const body = e instanceof AxiosError ? (e.response?.data as { error?: string } | null) : null;
      const server = body?.error ?? "";
      let key = errorKey;
      if (byServerError && server) {
        const part = Object.keys(byServerError).find((candidate) => server.includes(candidate));
        if (part) key = byServerError[part];
      }
      setError(t(key));
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, error };
}
