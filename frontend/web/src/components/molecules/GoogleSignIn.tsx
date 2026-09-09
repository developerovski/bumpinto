/* Kaynak: artboard Landing — "Google ile devam et". GIS politikası: ID token yalnız Google'ın
   render ettiği butonla gelir; özel stil yok. Sapma INDEX notunda. */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { ErrorText, Note } from "../atoms";

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
    } } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<void> | null = null;

/**
 * Düğmenin DİLİ betiğin `?hl=` parametresinden gelir — `renderButton`a geçilen `locale`
 * seçeneği GIS tarafından YOK SAYILIYOR (2026-09-09 sahada doğrulandı: sayfa `?lng=tr` ile
 * tamamen Türkçeyken düğme "Doorgaan met Google" kalıyordu; GIS kendi çözümlemesine —
 * tarayıcı/hesap/IP — düşüyor).
 *
 * Betik sayfa başına BİR kez yüklenir: dil ilk yüklemede sabitlenir. Kullanıcı uygulama
 * içinden dil değiştirirse düğme eski dilde kalır (yeniden yükleme gerekir) — GIS aynı
 * sayfada betiği ikinci kez yüklemeye izin vermiyor.
 */
function loadScript(lang: string): Promise<void> {
  if (window.google) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${SCRIPT}?hl=${encodeURIComponent(lang)}`; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("gsi")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** `onDone`: silme akışı gibi AYNI sayfada devam eden yerler gezinmeyi devralır. */
export default function GoogleSignIn({ onDone }: { onDone?: () => void }) {
  const { t, i18n } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadScript(locale).then(() => {
      if (cancelled || !window.google || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => {
          if (cancelled) return;
          void login(r.credential)
            .then(() => { if (onDone) onDone(); else navigate("/sessions"); })
            .catch(() => setError(t("landing.errLogin")));
        },
      });
      box.current.replaceChildren();
      window.google.accounts.id.renderButton(box.current, {
        theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 340,
        // GIS bunu yok sayıyor (bkz. `loadScript`); gerçek dil `?hl=` ile geliyor. Yine de
        // geçiliyor: sözleşme değişirse doğru değeri zaten taşıyor olalım.
        locale,
      });
    }).catch(() => setError(t("landing.errScript")));
    return () => { cancelled = true; };
  }, [clientId, login, navigate, onDone, locale, t]);

  if (!clientId) return <Note>{t("landing.noClientId")}</Note>;
  return (
    <>
      <div ref={box} className="flex min-h-[3.25rem] w-full max-w-[21.25rem] items-center" aria-label={t("landing.google")} />
      {error && <ErrorText>{error}</ErrorText>}
    </>
  );
}
