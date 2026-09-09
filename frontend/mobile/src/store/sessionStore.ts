import type { Schemas, SessionView } from "@bumpinto/shared";
import { create } from "zustand";

import { api } from "../lib/api";
import { repairParticipantToken } from "../lib/participantSession";
import { useNetStore } from "./netStore";

type SessionListResponse = Schemas["SessionListResponse"];

const synced = () => useNetStore.setState({ lastSyncAt: Date.now() });

export const useSessionStore = create<{
  list: SessionListResponse | null;
  view: SessionView | null;
  loading: boolean;
  /** i18n ANAHTARI (metin değil). */
  error: string | null;
  loadList: () => Promise<void>;
  loadView: (slug: string) => Promise<void>;
}>((set) => ({
  list: null,
  view: null,
  loading: false,
  error: null,

  async loadList() {
    set({ loading: true, error: null });
    try {
      set({ list: await api.listSessions() });
      synced();
    } catch {
      set({ error: "sessions.errLoad" });
    } finally {
      set({ loading: false });
    }
  },

  async loadView(slug) {
    try {
      const view = await api.getSession(slug);
      set({ view, error: null });
      synced();
      /* Jeton onarımı okumadan SONRA: listeden (ya da uygulama yeniden başladıktan sonra)
         açılan oturumda katılımcı jetonu yoktur ve her yazma ucu 403 alır (K-M39). Kendi
         hatasını yutar — buradaki `catch` "oturum bulunamadı" demek olurdu. */
      await repairParticipantToken(slug, view);
    } catch {
      set({ error: "session.notFound" });
    }
  },
}));

/** Görüntüleyenin katılımcı kimliği — web `sessionStore` ile aynı yardımcı. */
export const viewerId = (view: SessionView | null): string | null =>
  view?.viewer?.participantId ?? null;

/** Görüntüleyen oturumu kuran kişi mi. */
export const isHost = (view: SessionView | null): boolean => view?.viewer?.host === true;

/**
 * Yapıştırılan davet metninden slug çıkarır. Web'de bugün karşılığı YOK (davet kutusu
 * mobile özgü, artboard P2); M-9 `joinCode.ts`'i shared'a alırken bu da oraya taşınır.
 *: tam link (`https://bumpinto.app/j/x7k2m`),
 * `bumpinto://` şeması ya da çıplak 5 haneli kod. Tanınmazsa null — ekran düğmeyi kapatır.
 */
export function slugFromInvite(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const last = text.split(/[/?#]/).filter(Boolean).pop() ?? "";
  const code = last.toLowerCase();
  return /^[a-z0-9]{5}$/.test(code) ? code : null;
}
