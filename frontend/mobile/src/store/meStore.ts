import type { MeResponse, Schemas } from "@bumpinto/shared";
import { create } from "zustand";

import { api } from "../lib/api";

/**
 * Kullanıcı tercihleri. Profil ekranı ve tercih alt sayfası AYNI kaynağı okur — sayfa
 * kapanınca profil satırı kendiliğinden tazelenir, iki ayrı `me` kopyası doğmaz.
 *
 * `PUT /api/me` TAM değişim yapar: yalnız değişen alan gönderilir, sunucu diğerlerini korur.
 */
export const useMeStore = create<{
  me: MeResponse | null;
  /** i18n ANAHTARI (metin değil). */
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Schemas["UpdateMeRequest"]) => Promise<boolean>;
}>((set) => ({
  me: null,
  error: null,

  async load() {
    try {
      set({ me: await api.me(), error: null });
    } catch {
      set({ error: "profile.errSave" });
    }
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
