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

function loadScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("gsi")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export default function GoogleSignIn() {
  const { t, i18n } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !window.google || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => {
          if (cancelled) return;
          void login(r.credential).then(() => navigate("/sessions")).catch(() => setError(t("landing.errLogin")));
        },
      });
      box.current.replaceChildren();
      window.google.accounts.id.renderButton(box.current, {
        theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 340, locale: i18n.language,
      });
    }).catch(() => setError(t("landing.errScript")));
    return () => { cancelled = true; };
  }, [clientId, login, navigate, i18n.language, t]);

  if (!clientId) return <Note>{t("landing.noClientId")}</Note>;
  return (
    <>
      <div ref={box} className="flex min-h-[3.25rem] w-full max-w-[21.25rem] items-center" aria-label={t("landing.google")} />
      {error && <ErrorText>{error}</ErrorText>}
    </>
  );
}
