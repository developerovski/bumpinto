import type { ConsentsInput, MeResponse, Schemas } from "@bumpinto/shared";
import { create } from "zustand";

import { applyAnalyticsConsent } from "../lib/analytics";
import { api } from "../lib/api";

/**
 * Kullanıcı tercihleri. Profil ekranı ve tercih alt sayfası AYNI kaynağı okur — sayfa
 * kapanınca profil satırı kendiliğinden tazelenir, iki ayrı `me` kopyası doğmaz.
 *
 * `PUT /api/me` TAM değişim yapar (`UserProfile.withPreferences`): gövdede olmayan konum,
 * etkinlik, dil ve ulaşım türü SUNUCUDA silinir (yalnız ad ve `interests` null'da korunur).
 * Bu yüzden `update` mevcut `me`'nin tercih alanlarını taşır, `patch` yalnız değişeni ezer
 * (K-M46; web `authStore.updatePrefs` deseni). `interests` gönderilmez — sunucu korur.
 *
 * Rıza (`PUT /api/me/consents`) da tam yerine koymadır: `setConsents` eksik alanı mevcut
 * değerle doldurur — yoksa gönderilmeyen rıza sessizce `false`'a düşer. Sunucu yanıt gövdesi sözleşmede sabit olmadığından yazımdan sonra
 * `me()` yeniden çekilir: rızanın TEK kaynağı sunucudur, istemci hafızası değil.
 *
 * Yazma SIRASI (M-11/M-12 T5 incelemesi): her `update` sürümü artırır ve yalnız EN SON başlayan
 * kaydın yanıtı `me`ye yazılır — yavaş ağda sırasız dönen eski yanıt yenisini ezerdi. `saving`
 * uçuşta kayıt varken doğrudur ve DEPODA yaşar: ilgi alanı seçicisinin kilidi bileşende olsaydı sayfa
 * kapanıp açılınca sıfırlanır, eski listeden kurulmuş ikinci bir kayıt atılırdı. `load` başladığı
 * sürümü not eder; arada bir kayıt başladıysa bayat okumayı yazmaz. `clear` sürümü artırır: çıkıştan
 * sonra dönen eski hesabın yanıtı yeni oturuma yazılmaz.
 */
let revision = 0;
let inflight = 0;

export const useMeStore = create<{
  me: MeResponse | null;
  /** i18n ANAHTARI (metin değil). */
  error: string | null;
  /** Uçuşta bir `update` var mı. */
  saving: boolean;
  load: () => Promise<void>;
  update: (patch: Schemas["UpdateMeRequest"]) => Promise<boolean>;
  setConsents: (patch: Partial<ConsentsInput>) => Promise<boolean>;
  clear: () => void;
}>((set, get) => ({
  me: null,
  error: null,
  saving: false,

  async load() {
    const at = revision;
    try {
      const me = await api.me();
      if (at !== revision) return; // arada kayıt başladı ya da çıkış yapıldı: bu okuma bayat
      set({ me, error: null });
      applyAnalyticsConsent(me.consents?.analytics === true);
    } catch {
      if (at === revision) set({ error: "profile.errSave" });
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
    revision += 1;
    set({ me: null, error: null, saving: false });
    applyAnalyticsConsent(false);
  },

  async update(patch) {
    const me = get().me;
    // `me` yüklenmeden yazılmaz: kısmi gövde sunucudaki diğer tercihleri silerdi.
    if (!me) {
      set({ error: "profile.errSave" });
      return false;
    }
    const body: Schemas["UpdateMeRequest"] = {
      displayName: me.displayName,
      defaultLocation: me.defaultLocation,
      defaultActivity: me.defaultActivity,
      language: me.language,
      defaultTravelMode: me.defaultTravelMode,
      ...patch,
    };
    const mine = ++revision;
    inflight += 1;
    set({ saving: true });
    try {
      const result = await api.updateMe(body);
      if (mine === revision) set({ me: result, error: null });
      return true;
    } catch {
      if (mine === revision) set({ error: "profile.errSave" });
      return false;
    } finally {
      inflight -= 1;
      if (inflight === 0) set({ saving: false });
    }
  },
}));
