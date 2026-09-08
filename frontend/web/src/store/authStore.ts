import type { ConsentsInput, MeResponse, Schemas } from "@bumpinto/shared";
import { create } from "zustand";
import i18n from "../i18n";
import { loadLocalAnalyticsConsent, setAnalyticsConsent } from "../lib/analytics";
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
  /** PUT /api/me/consents — patch mevcut rızaların üstüne biner; başarısızsa FIRLATIR (UI geri alır). */
  saveConsents: (patch: Partial<ConsentsInput>) => Promise<void>;
  loginApple: (identityToken: string, nonce: string, fullName?: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

/** Spec §6 algılama sırası: ?lng= > sunucu tercihi > tarayıcı. URL'de dil varsa sunucu ezmez. */
function applyServerLanguage(me: MeResponse) {
  const fromUrl = new URLSearchParams(location.search).get("lng");
  const supported = i18n.options.supportedLngs || [];
  if (!fromUrl && me.language && supported.includes(me.language)) void i18n.changeLanguage(me.language);
}

/** Sunucudaki rıza tek gerçek kaynak; kapı her `me` tazelemesinde ona hizalanır. */
function applyAnalyticsConsent(me: MeResponse) {
  setAnalyticsConsent(me.consents?.analytics === true);
}

const NO_CONSENTS: ConsentsInput = { location: false, microphone: false, analytics: false };

export function consentsOf(me: MeResponse | null): ConsentsInput {
  const c = me?.consents;
  if (!c) return NO_CONSENTS;
  return { location: c.location === true, microphone: c.microphone === true, analytics: c.analytics === true };
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
      loadLocalAnalyticsConsent(); // anonim ziyaretçinin kendi tercihi tarayıcıda yaşar
    }
    if (me) {
      applyServerLanguage(me);
      applyAnalyticsConsent(me);
    }
  },
  login: async (idToken) => {
    await api.loginGoogle(idToken); // X-Client: web → HttpOnly cookie; body'de token kullanılmaz
    const me = await api.me();
    set({ me, status: "signed" });
    applyServerLanguage(me);
    applyAnalyticsConsent(me);
  },
  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ me: null, status: "anon" });
      setAnalyticsConsent(false);
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
  saveConsents: async (patch) => {
    const me = get().me;
    if (!me) return;
    await api.putConsents({ ...consentsOf(me), ...patch });
    const fresh = await api.me(); // updatedAt/version sunucudan gelir
    set({ me: fresh });
    applyAnalyticsConsent(fresh);
  },
  loginApple: async (identityToken, nonce, fullName) => {
    await api.loginApple({ identityToken, nonce, fullName });
    const me = await api.me();
    set({ me, status: "signed" });
    applyServerLanguage(me);
    applyAnalyticsConsent(me);
  },
  deleteAccount: async () => {
    await api.deleteMe();
    set({ me: null, status: "anon" });
    setAnalyticsConsent(false);
    useSessionsStore.getState().reset();
  },
}));
