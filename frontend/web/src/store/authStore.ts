import type { MeResponse, Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import i18n from "../i18n";
import { api } from "../lib/api";
import { useSessionsStore } from "./sessionsStore";

export type AuthStatus = "unknown" | "anon" | "signed";
type UpdateMeRequest = Schemas["UpdateMeRequest"];

type AuthState = {
  status: AuthStatus;
  me: MeResponse | null;
  load: () => Promise<void>;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setMe: (me: MeResponse) => void;
  /** PUT /api/me tam değişim yapar — mevcut me'den taşınıp patch ile ezilir. */
  updatePrefs: (patch: Partial<UpdateMeRequest>) => Promise<void>;
};

/** Spec §6 algılama sırası: ?lng= > sunucu tercihi > tarayıcı. URL'de dil varsa sunucu ezmez. */
function applyServerLanguage(me: MeResponse) {
  const fromUrl = new URLSearchParams(location.search).get("lng");
  const supported = i18n.options.supportedLngs || [];
  if (!fromUrl && me.language && supported.includes(me.language)) void i18n.changeLanguage(me.language);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "unknown",
  me: null,
  load: async () => {
    let me: MeResponse | null = null;
    try {
      me = await api.me();
      set({ me, status: "signed" });
    } catch {
      set({ me: null, status: "anon" }); // 401 ve ağ hatası aynı: giriş ekranı, tekrar giriş
    }
    if (me) applyServerLanguage(me);
  },
  login: async (idToken) => {
    await api.loginGoogle(idToken); // X-Client: web → HttpOnly cookie; body'de token kullanılmaz
    const me = await api.me();
    set({ me, status: "signed" });
    applyServerLanguage(me);
  },
  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ me: null, status: "anon" });
      useSessionsStore.getState().reset();
    }
  },
  setMe: (me) => set({ me, status: "signed" }),
  updatePrefs: async (patch) => {
    const me = get().me;
    if (!me) return;
    // PUT /api/me tam değişim yapar: alan eksik gönderilirse SUNUCUDA temizlenir — bu yüzden
    // mevcut `me`'nin TÜM alanları taşınır, `patch` yalnız değişeni ezer (defaultTravelMode dahil).
    const body: UpdateMeRequest = {
      displayName: me.displayName,
      defaultLocation: me.defaultLocation,
      defaultActivity: me.defaultActivity,
      language: me.language,
      defaultTravelMode: me.defaultTravelMode,
      ...patch,
    };
    const result = await api.updateMe(body);
    set({ me: result });
    const supported = i18n.options.supportedLngs || [];
    if (patch.language && supported.includes(patch.language)) void i18n.changeLanguage(patch.language);
  },
}));
