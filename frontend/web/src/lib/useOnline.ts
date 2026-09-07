/* R-W9 — ağ durumunun TEK kaynağı; şerit ve iskelet `navigator.onLine`ı kendi başlarına okumaz. */
import { useCallback, useEffect, useState } from "react";

export type OnlineState = {
  online: boolean;
  /** Çevrimdışına düşülen an (epoch ms); hiç düşülmediyse `null`. */
  lastOnlineAt: number | null;
};

export function useOnline(): OnlineState {
  const [state, setState] = useState<OnlineState>(() => ({
    // Desteklenmiyorsa (eski WebView) ÇEVRİMİÇİ say — yanlış şerit basmak, basmamaktan kötüdür.
    online: typeof navigator.onLine === "boolean" ? navigator.onLine : true,
    lastOnlineAt: null,
  }));
  useEffect(() => {
    const goOffline = () => setState((s) => (s.online ? { online: false, lastOnlineAt: Date.now() } : s));
    // goOffline ile simetrik koru: tekrarlanan "online" olayı gereksiz render tetiklemesin
    // (kod incelemesi #4).
    const goOnline = () => setState((s) => (s.online ? s : { online: true, lastOnlineAt: s.lastOnlineAt }));
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
  return state;
}

/* Kod incelemesi #1 (T9) — SW/PWA yok: çevrimdışıyken çıplak `location.reload()` `dist/index.html`ı
   önbellekten doğrulayamaz, tarayıcı ERR_INTERNET_DISCONNECTED sayfasını basar ve bellek-içi
   oturum durumu tamamen gider. Önce var olan `/api/config` ucuna hafif bir GET atılır (baseURL
   öneki `lib/api.ts` ile aynı mantık — prod'da API farklı origin'de); yalnız yanıt BAŞARILIYSA
   reload edilir. `AppShell`e gömülmez ki tek başına test edilebilsin. */
export function useRetryOnline(): { retry: () => void; checking: boolean } {
  const [checking, setChecking] = useState(false);
  const retry = useCallback(() => {
    setChecking(true);
    const base = import.meta.env.VITE_API_URL ?? "";
    fetch(`${base}/api/config`, { cache: "no-store" })
      .then((res) => {
        if (res.ok) location.reload();
      })
      .catch(() => {
        // Ağ hâlâ yok — şerit kalsın, reload YOK.
      })
      .finally(() => setChecking(false));
  }, []);
  return { retry, checking };
}
