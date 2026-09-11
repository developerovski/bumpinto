import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { create } from "zustand";

import i18n from "../i18n";
import { api, clearParticipantTokens } from "../lib/api";
import { signInWithApple } from "../lib/appleAuth";
import {
  clearAccessToken, clearRefreshToken, getAccessToken, getRefreshToken, setAccessToken,
  setRefreshToken,
} from "../lib/tokenStore";
import { useDiscoverStore } from "./discoverStore";
import { useMeStore } from "./meStore";
import { useSeatRequestsStore } from "./seatRequestsStore";
import { useSeatStore } from "./seatStore";

/** Hesaba bağlı durum: paylaşılan cihazda sonraki hesaba (ya da anonim ziyaretçiye) sızmasın.
    Keşfet önceki kullanıcının ilgi alanı süzgecini taşır; profil (`meStore`) onun ev konumunu —
    Keşfet dakika konumunu ve rozet farkını ORADAN okur. Koltuk isteği durumu ve host'un istek
    listesi de hesabındır. Katılımcı jetonları hesabın koltuklarıdır: kalsaydı sonraki kişi
    öncekinin koltuğuyla odaya girerdi. */
function resetAccountStores() {
  useDiscoverStore.getState().reset();
  useSeatStore.getState().reset();
  useSeatRequestsStore.getState().reset();
  useMeStore.getState().clear();
  clearParticipantTokens();
}

/**
 * Giriş durumu. Google ve Apple AYNI yolu kullanır (`finishLogin`): token'ı yaz, profili çek,
 * dili uygula. İki sağlayıcı için iki ayrı dal açılmaz — biri düzeltilip diğeri unutulmasın.
 *
 * `id_token` yalnız takas için kullanılır ve saklanmaz (`tokenStore` başlığı).
 */
const e = Constants.expoConfig?.extra as {
  googleWebClientId: string;
  googleIosClientId: string;
};

GoogleSignin.configure({ webClientId: e.googleWebClientId, iosClientId: e.googleIosClientId });

type AuthState = {
  status: "unknown" | "in" | "out" | "busy";
  userId: string | null;
  /** Üst çubuk avatarı için görünen ad; profil ekranı tam `me()` gövdesini kendi çeker. */
  displayName: string | null;
  /** i18n ANAHTARI (metin değil) — ekran `t()` ile çevirir. */
  error: string | null;
  restore: () => Promise<void>;
  signIn: () => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Sunucu yenilemeyi REDDETTİ: ağa gitmeden yerel jetonları at ve giriş ekranına düş. */
  signedOut: () => Promise<void>;
};

/** Google ve Apple'ın ORTAK son adımı: token → profil → dil. */
async function finishLogin(
  login: { accessToken?: string; refreshToken?: string; userId?: string },
  set: (partial: Partial<AuthState>) => void,
  errorKey: string,
): Promise<void> {
  // İkisi de ŞART: yenileme jetonu olmadan kullanıcı 15 dakika sonra sessizce düşerdi.
  if (!login.accessToken || !login.refreshToken) return set({ status: "out", error: errorKey });
  await setAccessToken(login.accessToken);
  await setRefreshToken(login.refreshToken);
  const me = await api.me().catch(() => null);
  if (me?.language) await i18n.changeLanguage(me.language);
  set({ status: "in", userId: login.userId ?? null, displayName: me?.displayName ?? null });
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  userId: null,
  displayName: null,
  error: null,

  async restore() {
    if (!(await getAccessToken())) return set({ status: "out" });
    set({ status: "in" });
    const me = await api.me().catch(() => null);
    if (me) set({ userId: me.id ?? null, displayName: me.displayName ?? null });
  },

  async signIn() {
    set({ status: "busy", error: null });
    try {
      await GoogleSignin.hasPlayServices();
      const idToken = (await GoogleSignin.signIn()).data?.idToken;
      if (!idToken) return set({ status: "out" });
      await finishLogin(await api.loginGoogle(idToken), set, "landing.errLogin");
    } catch {
      set({ status: "out", error: "landing.errLogin" });
    }
  },

  async signInApple() {
    set({ status: "busy", error: null });
    try {
      const login = await signInWithApple();
      // `null` = kullanıcı vazgeçti: hata gösterme, giriş ekranında kal.
      if (!login) return set({ status: "out" });
      await finishLogin(login, set, "landing.errApple");
    } catch {
      set({ status: "out", error: "landing.errApple" });
    }
  },

  async signOut() {
    // Jeton SUNUCUDA iptal edilsin: yalnız cihazdan silmek, çalınmış bir kopyayı 30 gün daha
    // canlı bırakırdı.
    await api.logout((await getRefreshToken()) ?? undefined).catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await clearAccessToken();
    await clearRefreshToken();
    set({ status: "out", userId: null, displayName: null });
    resetAccountStores();
  },

  /**
   * Sunucu yenilemeyi REDDETTİ (jeton iptal edilmiş ya da aile kapanmış). `signOut()` DEĞİL:
   * o ayrıca çıkış ucunu ve Google oturumunu kapatır — burada zaten reddedildik, ikinci bir
   * ağ turu beklemenin anlamı yok. `AuthGuard` `status: "out"` görünce köke atar.
   */
  async signedOut() {
    await clearAccessToken();
    await clearRefreshToken();
    set({ status: "out", userId: null, displayName: null });
    resetAccountStores();
  },
}));
