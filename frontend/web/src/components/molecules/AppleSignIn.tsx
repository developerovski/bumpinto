/* App Store 4.8: Google girişi olan uygulama eşdeğer bir alternatif sunmak zorunda.
   Apple JS SDK popup akışı: id_token + ham nonce sunucuya gider (POST /api/auth/apple);
   doğrulamayı ve eşleştirmeyi backend yapar (§2: önce apple_sub, sonra e-posta).
   Buton kendi stilimizle çizilir — Apple JS, Google GIS'in aksine buna izin verir. */
import { AppleLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Button, ErrorText, Note } from "../atoms";

type AppleAuth = {
  init: (cfg: { clientId: string; scope: string; redirectURI: string; usePopup: boolean; nonce: string }) => void;
  signIn: () => Promise<{
    authorization: { id_token: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }>;
};

declare global {
  interface Window {
    AppleID?: { auth: AppleAuth };
  }
}

const SCRIPT = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.AppleID) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("appleid")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Tekrar oynatma koruması — ham nonce sunucuya da gider, karşılaştırmayı backend yapar. */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Popup'ın kapatılması hata değildir — sessizce geçilir. */
function cancelled(e: unknown): boolean {
  const code = (e as { error?: string }).error;
  return code === "popup_closed_by_user" || code === "user_cancelled_authorize";
}

export default function AppleSignIn({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const loginApple = useAuthStore((s) => s.loginApple);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;

  if (!clientId) return <Note>{t("landing.noAppleClientId")}</Note>;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await loadScript();
      const nonce = makeNonce();
      window.AppleID!.auth.init({
        clientId: clientId!,
        scope: "name email",
        redirectURI: redirectUri ?? window.location.origin,
        usePopup: true,
        nonce,
      });
      const result = await window.AppleID!.auth.signIn();
      const name = result.user?.name;
      const fullName = name ? [name.firstName, name.lastName].filter(Boolean).join(" ") : "";
      await loginApple(result.authorization.id_token, nonce, fullName || undefined);
      if (onDone) onDone();
      else navigate("/sessions");
    } catch (e) {
      if (!cancelled(e)) setError(t("landing.errApple"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" kind="white" disabled={busy} onClick={() => void start()}>
        <AppleLogo size={18} weight="fill" aria-hidden />
        {t("landing.apple")}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  );
}
