import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { create } from "zustand";

import i18n from "../i18n";
import { api } from "../lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/tokenStore";

/**
 * Giriş durumu. Apple girişi (R-M1) M-5'te eklenir — burada yalnız Google var.
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
  signOut: () => Promise<void>;
};

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
      const login = await api.loginGoogle(idToken);
      if (!login.accessToken) return set({ status: "out", error: "landing.errLogin" });
      await setAccessToken(login.accessToken);
      const me = await api.me().catch(() => null);
      if (me?.language) await i18n.changeLanguage(me.language);
      set({
        status: "in",
        userId: login.userId ?? null,
        displayName: me?.displayName ?? null,
      });
    } catch {
      set({ status: "out", error: "landing.errLogin" });
    }
  },

  async signOut() {
    await api.logout().catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await clearAccessToken();
    set({ status: "out", userId: null, displayName: null });
  },
}));
