import type { Schemas } from "@bumpinto/shared";
import { create } from "zustand";

import { api } from "../lib/api";

export type ReportReason = Schemas["ReportRequest"]["reason"];

/**
 * Bildir / engelle durumu (R-M7) — web `socialStore` ile AYNI davranış.
 *
 * Bildirme ARDINDAN engelleme otomatik gelir (Apple 1.2): bildiren kişi, bildirdiği kişiyi
 * oturumda görmeye devam etmemeli. İki çağrı da başarılıysa satır yerel olarak engellenir;
 * sunucu tazelemesi M-7 oturum ekranında olur.
 */
type SocialState = {
  blocked: Record<string, true>;
  busy: boolean;
  /** i18n ANAHTARI (metin değil). */
  notice: { key: string; name: string } | null;
  error: string | null;
  report: (slug: string, participantId: string, reason: ReportReason, note?: string) => Promise<void>;
  block: (participantId: string) => Promise<void>;
  clearNotice: () => void;
};

export const useSocialStore = create<SocialState>((set, get) => ({
  blocked: {},
  busy: false,
  notice: null,
  error: null,

  async report(slug, participantId, reason, note) {
    set({ busy: true, error: null });
    try {
      await api.report({ sessionSlug: slug, targetParticipantId: participantId, reason, note });
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
    } catch {
      set({ error: "social.error" });
    } finally {
      set({ busy: false });
    }
  },

  async block(participantId) {
    set({ busy: true, error: null });
    try {
      await api.blockParticipant({ participantId });
      set({ blocked: { ...get().blocked, [participantId]: true } });
    } catch {
      set({ error: "social.error" });
    } finally {
      set({ busy: false });
    }
  },

  clearNotice: () => set({ notice: null }),
}));
