import type { ConsentsInput, MeResponse, Schemas } from "@bumpinto/shared";
import { create } from "zustand";

import { applyAnalyticsConsent } from "../lib/analytics";
import { api } from "../lib/api";

/**
 * Kullanıcı tercihleri. Profil ekranı ve tercih alt sayfası AYNI kaynağı okur — sayfa
 * kapanınca profil satırı kendiliğinden tazelenir, iki ayrı `me` kopyası doğmaz.
 *
 * `PUT /api/me` TAM değişim yapar: yalnız değişen alan gönderilir, sunucu diğerlerini korur.
 *
 * Rıza (`PUT /api/me/consents`) bunun TERSİDİR: gövde TAM YERİNE KOYMADIR, bu yüzden
 * `setConsents` eksik alanı mevcut değerle doldurur — yoksa gönderilmeyen rıza sessizce
 * `false`'a düşer. Sunucu yanıt gövdesi sözleşmede sabit olmadığından yazımdan sonra
 * `me()` yeniden çekilir: rızanın TEK kaynağı sunucudur, istemci hafızası değil.
 */
export const useMeStore = create<{
  me: MeResponse | null;
  /** i18n ANAHTARI (metin değil). */
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Schemas["UpdateMeRequest"]) => Promise<boolean>;
  setConsents: (patch: Partial<ConsentsInput>) => Promise<boolean>;
  clear: () => void;
}>((set, get) => ({
  me: null,
  error: null,

  async load() {
    try {
      const me = await api.me();
      set({ me, error: null });
      applyAnalyticsConsent(me.consents?.analytics === true);
    } catch {
      set({ error: "profile.errSave" });
    }
  },

  async setConsents(patch) {
    const current = get().me?.consents;
    try {
      await api.putConsents({
        location: patch.location ?? current?.location ?? false,
        microphone: patch.microphone ?? current?.microphone ?? false,
        analytics: patch.analytics ?? current?.analytics ?? false,
      });
      const me = await api.me();
      set({ me, error: null });
      applyAnalyticsConsent(me.consents?.analytics === true);
      return true;
    } catch {
      set({ error: "account.errConsent" });
      return false;
    }
  },

  clear() {
    set({ me: null, error: null });
    applyAnalyticsConsent(false);
  },

  async update(patch) {
    try {
      set({ me: await api.updateMe(patch), error: null });
      return true;
    } catch {
      set({ error: "profile.errSave" });
      return false;
    }
  },
}));
